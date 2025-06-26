const { Client } = require('@elastic/elasticsearch');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_PDF_DIRECTORY = process.env.PDF_DIRECTORY || "C:/Users/laure/Desktop/Document";

// Initialize Elasticsearch client with retry and timeout settings
const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http:/10.42.0.45:9200/',
  maxRetries: 3,
  requestTimeout: 30000,
  sniffOnStart: true,
  sniffInterval: 30000,
});

// Add ping function to check elasticsearch connection
const ping = async () => {
  try {
    const result = await esClient.ping();
    console.log('Elasticsearch cluster is running');
    return result;
  } catch (error) {
    console.error('Elasticsearch cluster is down:', error);
    throw error;
  }
};

const searchService = {  
  async searchWithHighlight(searchTerm) {
    try {
      // First check if elasticsearch is available
      await ping();
      
      console.log('Searching for term:', searchTerm);
      
      // Try with highlighting first
      try {
        const response = await esClient.search({
          index: process.env.INDEX || 'test2',
          body: {
            query: {
              match: {
                content: searchTerm
              }
            },
            highlight: {
              max_analyzed_offset: 1000000, // Set to match index setting
              fragment_size: 150,
              number_of_fragments: 3,
              fields: {
                content: {
                  pre_tags: ['<strong style="font-weight:bold;color:black;">'],
                  post_tags: ['</strong>']
                }
              }
            }
          }
        });

        console.log('Search response:', {
          total: response.hits.total,
          hits: response.hits.hits.length
        });

        return response;
      } catch (highlightError) {
        // If highlighting fails due to large content, search without highlighting
        console.log('Highlighting failed, searching without highlights:', highlightError.message);
        
        const response = await esClient.search({
          index: process.env.INDEX || 'test2',
          body: {
            query: {
              match: {
                content: searchTerm
              }
            }
          }
        });

        console.log('Search response (no highlights):', {
          total: response.hits.total,
          hits: response.hits.hits.length
        });

        return response;
      }
    } catch (error) {
      console.error('Search error:', {
        message: error.message,
        name: error.name,
        meta: error.meta
      });
      throw error;
    }
  },
  
  async searchDocumentWithHighlight(documentName, searchTerm) {
    try {
      await ping();
      
      // Store the original document name for later file system operations
      const originalDocumentName = documentName;
      
      // Handle search term
      const lowerSearchTerm = ' ' + searchTerm.toLowerCase();
      
      // Normalize document name to improve matching chances
      // Replace URL encoded characters and handle special characters
      let normalizedDocName = documentName;
      try {
        // Try to decode any remaining URL encoded characters
        if (normalizedDocName.includes('%')) {
          normalizedDocName = decodeURIComponent(normalizedDocName);
        }
      } catch (e) {
        console.warn('Error decoding document name:', e.message);
      }
      
      normalizedDocName = normalizedDocName
        .replace(/_/g, ' ')
        .replace(/\+/g, ' ')
        .replace(/°/g, ' ')
        .replace(/N°/g, 'N ')
        .replace(/N\u00B0/g, 'N ') // Handle degree symbol
        .replace(/\u00B0/g, ' ')   // Handle degree symbol
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('Searching for document:', {
        documentName: normalizedDocName,
        originalName: documentName,
        searchTerm: lowerSearchTerm,
        index: process.env.INDEX || 'test2'
      });
      
      // Try multiple query types to find the document
      let searchResponse;
      try {
        // First try a simple search with multi_match for better flexibility
        searchResponse = await esClient.search({
          index: process.env.INDEX || 'test2',
          body: {
            query: {
              multi_match: {
                query: normalizedDocName,
                fields: ["file.filename", "file.filename.keyword"],
                type: "best_fields",
                fuzziness: "AUTO"
              }
            }
          }
        });

        // If no results, try with a more specific query approach
        if (searchResponse.hits.hits.length === 0) {
          // Extract meaningful parts of the filename
          const filenameParts = normalizedDocName.split(/[_\s.]+/).filter(part => part.length > 2);
          const searchTerms = filenameParts.map(term => term.toLowerCase());
          
          console.log('Trying with search terms:', searchTerms);
          
          // Add special handling for Décret with N° format
          let hasDecretFormat = false;
          if (normalizedDocName.toLowerCase().includes('décret') || normalizedDocName.toLowerCase().includes('decret')) {
            // Look for patterns like N°2019 or N 2019 or N2019
            const decretNumberMatch = normalizedDocName.match(/N[\s°]?(\d+)/i);
            if (decretNumberMatch && decretNumberMatch[1]) {
              hasDecretFormat = true;
              // Add the decree number as a separate search term
              searchTerms.push(decretNumberMatch[1]);
              console.log('Added decree number to search terms:', decretNumberMatch[1]);
            }
          }
          
          // Build a should query with the important terms
          const shouldClauses = searchTerms.map(term => ({
            wildcard: {
              "file.filename": {
                value: `*${term}*`,
                boost: 1.0
              }
            }
          }));
          
          searchResponse = await esClient.search({
            index: process.env.INDEX || 'test2',
            body: {
              query: {
                bool: {
                  should: shouldClauses,
                  minimum_should_match: Math.max(1, Math.ceil(searchTerms.length * 0.3)) // Match at least 30% of the terms or at least 1
                }
              }
            }
          });
          
          // If still no results, try a broader search
          if (searchResponse.hits.hits.length === 0 && searchTerms.length > 2) {
            console.log('Trying with broader search');
            
            // Take the most significant terms (longer than 4 chars)
            const significantTerms = searchTerms.filter(term => term.length > 4);
            
            if (significantTerms.length > 0) {
              const broadShouldClauses = significantTerms.map(term => ({
                wildcard: {
                  "file.filename": {
                    value: `*${term}*`,
                    boost: 1.0
                  }
                }
              }));
              
              searchResponse = await esClient.search({
                index: process.env.INDEX || 'test2',
                body: {
                  query: {
                    bool: {
                      should: broadShouldClauses,
                      minimum_should_match: 1 // Match at least one significant term
                    }
                  }
                }
              });
            }
          }
        }
      } catch (searchError) {
        console.error('Error during search:', searchError.message);
        throw new Error('Document not found');
      }
      
      // If no results, we'll try a direct query using the document name
      if (searchResponse.hits.hits.length === 0) {
        console.log('Document not found with normalized search, trying direct index query');
        
        // Get all documents and check for similar names
        const allDocsResponse = await esClient.search({
          index: process.env.INDEX || 'test2',
          body: {
            size: 500, // Increase to get more potential matches
            query: {
              match_all: {}
            },
            _source: ["file.filename"]
          }
        });
        
        // Check for similar document names
        if (allDocsResponse.hits.hits.length > 0) {
          // Get all document names
          const allDocNames = allDocsResponse.hits.hits.map(hit => 
            hit._source.file?.filename || ''
          ).filter(name => name); // Filter out empty names
          
          console.log(`Found ${allDocNames.length} total documents in index`);
          
          // Find the closest match using a more sophisticated approach
          const normalizedSearchName = normalizedDocName.toLowerCase().replace(/\.pdf$/, '');
          let bestMatch = null;
          let highestSimilarity = 0;
          
          // Get unique words from the search name (with length > 3)
          const searchWords = [...new Set(
            normalizedSearchName.split(/[\s_.-]+/)
              .filter(part => part.length > 3)
              .map(part => part.toLowerCase())
          )];
          
          console.log('Searching with key words:', searchWords);
          
          for (const name of allDocNames) {
            const lowerName = name.toLowerCase();
            let similarity = 0;
            let matchedWords = 0;
            
            // Count how many search words appear in the document name
            for (const word of searchWords) {
              if (lowerName.includes(word)) {
                similarity += word.length;
                matchedWords++;
              }
            }
            
            // Boost if multiple words match
            if (matchedWords > 1) {
              similarity *= (1 + (matchedWords / searchWords.length));
            }
            
            if (similarity > highestSimilarity) {
              highestSimilarity = similarity;
              bestMatch = name;
            }
          }
          
          // Accept matches with a good score
          if (bestMatch && highestSimilarity > 8) {
            console.log(`Found potential match: ${bestMatch} with similarity ${highestSimilarity}`);
            
            // Search using the matched name
            searchResponse = await esClient.search({
              index: process.env.INDEX || 'test2',
              body: {
                query: {
                  match_phrase: {
                    "file.filename.keyword": bestMatch
                  }
                }
              }
            });
          }
        }
      }
      
      console.log('Final search response:', {
        total: searchResponse.hits.total,
        hits: searchResponse.hits.hits.length
      });

      if (searchResponse.hits.hits.length === 0) {
        console.log('Document not found after all attempts:', documentName);
        throw new Error('Document not found');
      }
      
      const document = searchResponse.hits.hits[0]._source;
      const fileName = document.file.filename;
      
      // Try multiple approaches for finding the local file
      let localFilePath = path.join(LOCAL_PDF_DIRECTORY, fileName);
      let fileExists = fs.existsSync(localFilePath);
      
      console.log('Checking for PDF file:', {
        elasticsearchFilename: fileName,
        localPath: localFilePath,
        exists: fileExists
      });
      
      // If file doesn't exist with the Elasticsearch filename, try with original document name
      if (!fileExists) {
        localFilePath = path.join(LOCAL_PDF_DIRECTORY, originalDocumentName);
        fileExists = fs.existsSync(localFilePath);
        
        console.log('Trying with original document name:', {
          originalName: originalDocumentName,
          localPath: localFilePath,
          exists: fileExists
        });
        
        // Try adding PDF extension if it's missing
        if (!fileExists && !originalDocumentName.toLowerCase().endsWith('.pdf')) {
          localFilePath = path.join(LOCAL_PDF_DIRECTORY, `${originalDocumentName}.pdf`);
          fileExists = fs.existsSync(localFilePath);
          console.log('Trying with added PDF extension:', {
            path: localFilePath,
            exists: fileExists
          });
        }
      }
      
      // Try with decoded document name if still not found
      if (!fileExists) {
        try {
          const decodedName = decodeURIComponent(originalDocumentName);
          localFilePath = path.join(LOCAL_PDF_DIRECTORY, decodedName);
          fileExists = fs.existsSync(localFilePath);
          
          console.log('Trying with fully decoded document name:', {
            decodedName,
            localPath: localFilePath,
            exists: fileExists
          });
          
          // Special handling for Décret N° format documents
          if (!fileExists && (decodedName.includes('Décret') || decodedName.includes('décret'))) {
            // Try different variations of N° format
            const variations = [
              decodedName.replace(/N°/g, 'N '),
              decodedName.replace(/N /g, 'N°'),
              decodedName.replace(/N\u00B0/g, 'N '),
              decodedName.replace(/N /g, 'N\u00B0')
            ];
            
            for (const variant of variations) {
              if (fileExists) break;
              
              localFilePath = path.join(LOCAL_PDF_DIRECTORY, variant);
              fileExists = fs.existsSync(localFilePath);
              
              if (fileExists) {
                console.log('Found file with variant formatting:', {
                  variant,
                  localPath: localFilePath
                });
              }
            }
          }
        } catch (e) {
          console.warn('Error decoding document name:', e.message);
        }
      }
      
      // If still doesn't exist, try to find a similar filename in the directory
      if (!fileExists) {
        console.log('Trying to find similar filename in directory');
        
        // Get all files in the directory
        const files = fs.readdirSync(LOCAL_PDF_DIRECTORY);
        console.log(`Found ${files.length} files in directory`);
        
        // Get terms from both original document name and elasticsearch filename
        const originalTerms = originalDocumentName.toLowerCase().replace(/\.pdf$/i, '').split(/[\s_.-]+/).filter(t => t.length > 3);
        const esTerms = fileName.toLowerCase().replace(/\.pdf$/i, '').split(/[\s_.-]+/).filter(t => t.length > 3);
        const searchTerms = [...new Set([...originalTerms, ...esTerms])]; // Combine unique terms
        
        // Special handling for Décret documents - extract the decree number if present
        if ((originalDocumentName.toLowerCase().includes('décret') || originalDocumentName.toLowerCase().includes('decret'))) {
          const decretNumberMatch = originalDocumentName.match(/N[\s°]?(\d+)/i);
          if (decretNumberMatch && decretNumberMatch[1]) {
            searchTerms.push(decretNumberMatch[1]);
            console.log('Added decree number to file search terms:', decretNumberMatch[1]);
          }
        }
        
        console.log('Looking for file with terms:', searchTerms);
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const file of files) {
          const lowerFileName = file.toLowerCase();
          let score = 0;
          let matchedTerms = 0;
          
          // Count matching terms and give more weight to matches with multiple terms
          for (const term of searchTerms) {
            if (lowerFileName.includes(term)) {
              score += term.length;
              matchedTerms++;
            }
          }
          
          // Boost score for files matching multiple terms
          if (matchedTerms > 1) {
            score *= (1 + (matchedTerms / searchTerms.length));
          }
          
          // Extra boost for exact decree number match for decree documents
          if ((originalDocumentName.toLowerCase().includes('décret') || originalDocumentName.toLowerCase().includes('decret'))) {
            const fileDecretMatch = lowerFileName.match(/n[\s°]?(\d+)/i);
            const docDecretMatch = originalDocumentName.toLowerCase().match(/n[\s°]?(\d+)/i);
            
            if (fileDecretMatch && docDecretMatch && fileDecretMatch[1] === docDecretMatch[1]) {
              score *= 2;
              console.log('Found exact decree number match:', {
                file,
                decretNumber: fileDecretMatch[1]
              });
            }
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = file;
          }
        }
        
        if (bestMatch && bestScore > 8) {
          localFilePath = path.join(LOCAL_PDF_DIRECTORY, bestMatch);
          fileExists = fs.existsSync(localFilePath);
          
          console.log('Found potential file match:', {
            matchedFile: bestMatch,
            score: bestScore,
            exists: fileExists
          });
        }
      }
      
      if (fileExists) {
        const existingPdfBytes = fs.readFileSync(localFilePath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const pdfData = await pdfParse(existingPdfBytes);
        const numPages = pdfData.numpages;
        const pagesText = pdfData.text.split('\n\n');
        const newPdfDoc = await PDFDocument.create();

        const normalizeText = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();
        const searchTermInPage = (pageIndex) => {
          const pageText = pagesText[pageIndex] || '';
          const normalizedText = normalizeText(pageText);
          return normalizedText.includes(lowerSearchTerm);
        };

        for (let i = 0; i < numPages; i++) {
          if (i === 0) {
            const [pageCopy] = await newPdfDoc.copyPages(pdfDoc, [i]);
            newPdfDoc.addPage(pageCopy);
          }

          if (searchTermInPage(i)) {
            const [pageCopy] = await newPdfDoc.copyPages(pdfDoc, [i]);
            newPdfDoc.addPage(pageCopy);
          }

          if (i === numPages-1) {
            const [pageCopy] = await newPdfDoc.copyPages(pdfDoc, [i]);
            newPdfDoc.addPage(pageCopy);
          }
        }

        console.log('Generated highlighted PDF for document:', documentName);
        return await newPdfDoc.save();
      }

      console.log('PDF file not found in local directory:', localFilePath);
      return null;
    } catch (error) {
      console.error('Document search error:', {
        message: error.message,
        name: error.name,
        meta: error.meta,
        documentName,
        searchTerm
      });
      throw error;
    }
  }
};

module.exports = searchService;
