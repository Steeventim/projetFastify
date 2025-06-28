const { Client } = require('@elastic/elasticsearch');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_PDF_DIRECTORY = process.env.PDF_DIRECTORY || "/home/tims/Dev/FastifyProjet/myproject/uploads";

// Initialize Elasticsearch client with retry and timeout settings
const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
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
  // Fonction fallback pour simuler une recherche quand Elasticsearch n'est pas disponible
  generateMockSearchResponse: (searchTerm) => {
    return {
      hits: {
        total: { value: 1 },
        hits: [{
          _source: {
            content: `Ceci est un contenu simulé contenant le terme ${searchTerm}. 
                      Cette réponse est générée car Elasticsearch n'est pas disponible.
                      Le système DGI continue de fonctionner en mode dégradé.`,
            file: {
              filename: 'document-simulé.pdf'
            }
          },
          highlight: {
            content: [`Ceci est un contenu simulé contenant le terme <strong>${searchTerm}</strong>.`]
          },
          _score: 1.0
        }]
      }
    };
  },

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
      
      // Si Elasticsearch n'est pas disponible, utiliser la réponse de fallback
      if (error.code === 'ECONNREFUSED' || error.message.includes('cluster')) {
        console.log('Elasticsearch non disponible, utilisation du mode fallback');
        return this.generateMockSearchResponse(searchTerm);
      }
      
      throw error;
    }
  },

  async searchDocumentWithHighlight(documentName, searchTerm) {
    try {
      await ping();
      
      // Décoder le nom du document s'il est encodé
      const decodedDocumentName = decodeURIComponent(documentName);
      
      const space = ' ' + searchTerm.toLowerCase();
      const lowerSearchTerm = space;

      console.log('Searching for document:', {
        originalDocumentName: documentName,
        decodedDocumentName: decodedDocumentName,
        searchTerm: lowerSearchTerm,
        index: process.env.INDEX || 'test2'
      });

      const searchResponse = await esClient.search({
        index: process.env.INDEX || 'test2',
        query: {
          match: {
            "file.filename": decodedDocumentName  // Utiliser le nom décodé
          }
        },
        highlight: {
          max_analyzed_offset: 2000000,
          fields: {
            content: {}
          }
        }
      });

      console.log('Search query:', decodedDocumentName);
      console.log('Search response:', JSON.stringify(searchResponse, null, 2));

      if (searchResponse.hits.hits.length === 0) {
        console.log('Document not found:', decodedDocumentName);
        // Essayer avec le nom original si le décodé ne marche pas
        const originalSearchResponse = await esClient.search({
          index: process.env.INDEX || 'test2',
          query: {
            match: {
              "file.filename": documentName
            }
          }
        });
        
        if (originalSearchResponse.hits.hits.length === 0) {
          console.log('Document not found with original name either:', documentName);
          throw new Error('Document not found');
        }
        
        console.log('Document found with original name');
        searchResponse.hits = originalSearchResponse.hits;
      }

      const document = searchResponse.hits.hits[0]._source;
      const fileName = document.file.filename;
      
      // Essayer plusieurs variantes du chemin de fichier
      const possiblePaths = [
        path.join(LOCAL_PDF_DIRECTORY, fileName),
        path.join(LOCAL_PDF_DIRECTORY, decodedDocumentName),
        path.join(LOCAL_PDF_DIRECTORY, documentName)
      ];
      
      let localFilePath = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          localFilePath = testPath;
          console.log('File found at:', testPath);
          break;
        }
      }

      if (!localFilePath) {
        console.log('PDF file not found in any of these locations:');
        possiblePaths.forEach(p => console.log(' -', p));
        throw new Error('PDF file not found in local directory');
      }

      if (fs.existsSync(localFilePath)) {
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
            const [pageCopy] = await newPdfDoc.copyPages(pdfDoc, [i-1]);
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
      
      // Si Elasticsearch n'est pas disponible, retourner null pour déclencher la génération PDF fallback
      if (error.code === 'ECONNREFUSED' || error.message.includes('cluster')) {
        console.log('Elasticsearch non disponible pour searchDocumentWithHighlight, retour null');
        return null;
      }
      
      throw error;
    }
  },

  async generateDocumentPreview(documentName, searchTerm) {
    try {
      console.log('=== generateDocumentPreview START ===');
      console.log('Document:', documentName, 'Search term:', searchTerm);
      
      // Décoder le nom du document s'il est encodé
      const decodedDocumentName = decodeURIComponent(documentName);
      
      let localFilePath = null;
      
      // D'abord, essayer de récupérer le path.real depuis Elasticsearch
      try {
        console.log('Searching Elasticsearch for document path...');
        const searchResponse = await this.searchWithHighlight(searchTerm);
        
        if (searchResponse && searchResponse.hits.hits.length > 0) {
          // Chercher un document qui correspond au nom recherché
          const matchingDoc = searchResponse.hits.hits.find(hit => {
            const filename = hit._source.file?.filename || hit._source.filename || '';
            return filename.includes(decodedDocumentName) || 
                   filename.includes(documentName) ||
                   decodedDocumentName.includes(filename);
          });
          
          if (matchingDoc) {
            // Extraire le path.real depuis Elasticsearch
            const physicalPath = matchingDoc._source.path?.real || 
                               matchingDoc._source.file?.path?.real || 
                               matchingDoc._source.file?.path;
            
            if (physicalPath && fs.existsSync(physicalPath)) {
              localFilePath = physicalPath;
              console.log('Document found via Elasticsearch path.real:', physicalPath);
            } else {
              console.log('Path from Elasticsearch not accessible:', physicalPath);
            }
          }
        }
      } catch (esError) {
        console.log('Could not retrieve path from Elasticsearch:', esError.message);
      }
      
      // Fallback : essayer plusieurs variantes du chemin de fichier si Elasticsearch n'a pas fourni un chemin valide
      if (!localFilePath) {
        console.log('Falling back to path guessing...');
        const possiblePaths = [
          path.join(LOCAL_PDF_DIRECTORY, decodedDocumentName),
          path.join(LOCAL_PDF_DIRECTORY, documentName),
          path.join(LOCAL_PDF_DIRECTORY, decodedDocumentName + '.pdf'),
          path.join(LOCAL_PDF_DIRECTORY, documentName + '.pdf')
        ];
        
        for (const testPath of possiblePaths) {
          if (fs.existsSync(testPath)) {
            localFilePath = testPath;
            console.log('File found at (fallback):', testPath);
            break;
          }
        }
      }

      if (!localFilePath) {
        console.log('PDF file not found in any location');
        throw new Error('PDF file not found in local directory or via Elasticsearch');
      }

      // Lire le fichier PDF
      const existingPdfBytes = fs.readFileSync(localFilePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pdfData = await pdfParse(existingPdfBytes);
      
      const totalPages = pdfData.numpages;
      const fullText = pdfData.text;
      
      console.log(`PDF loaded: ${totalPages} pages, ${fullText.length} characters`);
      
      // Méthode améliorée pour diviser le texte par pages
      let pageTexts = [];
      
      // Essayer d'abord la division par form feed
      if (fullText.includes('\f')) {
        pageTexts = fullText.split('\f');
      } else {
        // Sinon, diviser par estimation basée sur la longueur
        const avgPageLength = Math.ceil(fullText.length / totalPages);
        for (let i = 0; i < totalPages; i++) {
          const start = i * avgPageLength;
          const end = Math.min((i + 1) * avgPageLength, fullText.length);
          pageTexts.push(fullText.substring(start, end));
        }
      }
      
      // S'assurer qu'on a le bon nombre de pages
      while (pageTexts.length < totalPages) {
        pageTexts.push('');
      }
      while (pageTexts.length > totalPages) {
        pageTexts.pop();
      }
      
      console.log(`Text divided into ${pageTexts.length} page segments`);
      
      // Normaliser le terme de recherche
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      
      // Trouver les pages contenant le terme de recherche (recherche flexible)
      const pagesWithMatches = [];
      pageTexts.forEach((pageText, index) => {
        const normalizedPageText = pageText.toLowerCase();
        // Recherche flexible : chercher le terme avec des variantes
        const searchVariants = [
          normalizedSearchTerm,
          normalizedSearchTerm.replace(/s$/, ''), // enlever le 's' final
          normalizedSearchTerm + 's', // ajouter un 's'
        ];
        
        let matchCount = 0;
        let hasMatch = false;
        
        searchVariants.forEach(variant => {
          const matches = (normalizedPageText.match(new RegExp(variant, 'gi')) || []).length;
          if (matches > 0) {
            hasMatch = true;
            matchCount += matches;
          }
        });
        
        if (hasMatch) {
          pagesWithMatches.push({
            pageNumber: index + 1,
            content: pageText.trim(),
            hasMatches: true,
            matchCount: matchCount
          });
        }
      });
      
      console.log(`Found ${pagesWithMatches.length} pages with matches`);
      
      // Construire la prévisualisation selon le critère : première page + pages avec contenu + dernière page
      const previewPages = [];
      
      // 1. Première page (si elle n'est pas déjà dans les résultats)
      if (pageTexts[0] && !pagesWithMatches.some(p => p.pageNumber === 1)) {
        previewPages.push({
          pageNumber: 1,
          content: pageTexts[0].trim().substring(0, 800) + (pageTexts[0].length > 800 ? '...' : ''),
          hasMatches: false,
          matchCount: 0,
          pageType: 'first'
        });
      }
      
      // 2. Pages avec correspondances
      pagesWithMatches.forEach(page => {
        // Limiter le contenu et ajouter des highlights
        let content = page.content;
        if (content.length > 1000) {
          // Trouver un extrait autour des correspondances
          const firstMatchIndex = content.toLowerCase().indexOf(normalizedSearchTerm);
          const start = Math.max(0, firstMatchIndex - 200);
          const end = Math.min(content.length, firstMatchIndex + 800);
          content = (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
        }
        
        previewPages.push({
          pageNumber: page.pageNumber,
          content: content,
          hasMatches: true,
          matchCount: page.matchCount,
          pageType: 'match',
          matchHighlights: this.highlightMatches(content, normalizedSearchTerm)
        });
      });
      
      // 3. Dernière page (si elle n'est pas déjà dans les résultats et différente de la première)
      if (totalPages > 1 && pageTexts[totalPages - 1] && 
          !pagesWithMatches.some(p => p.pageNumber === totalPages) &&
          totalPages !== 1) {
        previewPages.push({
          pageNumber: totalPages,
          content: pageTexts[totalPages - 1].trim().substring(0, 800) + (pageTexts[totalPages - 1].length > 800 ? '...' : ''),
          hasMatches: false,
          matchCount: 0,
          pageType: 'last'
        });
      }
      
      // Trier par numéro de page
      previewPages.sort((a, b) => a.pageNumber - b.pageNumber);
      
      const totalMatches = pagesWithMatches.reduce((sum, page) => sum + page.matchCount, 0);
      
      const result = {
        documentInfo: {
          filename: decodedDocumentName,
          totalPages: totalPages,
          physicalPath: localFilePath,
          previewType: 'Physical Document'
        },
        searchInfo: {
          searchTerm: searchTerm,
          normalizedTerm: normalizedSearchTerm,
          matchCount: totalMatches,
          pagesWithMatches: pagesWithMatches.length,
          timestamp: new Date().toISOString()
        },
        previewPages: previewPages,
        summary: `Document physique analysé: ${totalPages} pages, ${totalMatches} occurrence(s) trouvée(s) sur ${pagesWithMatches.length} page(s).`
      };
      
      console.log('=== generateDocumentPreview END ===');
      return result;
      
    } catch (error) {
      console.error('Error in generateDocumentPreview:', {
        message: error.message,
        documentName,
        searchTerm,
        stack: error.stack
      });
      throw error;
    }
  },

  // Nouvelle fonction pour générer un PDF physique structuré en 3 parties:
  // 1. Première page du document original
  // 2. Pages avec résultats de recherche
  // 3. Dernière page du document original
  async generateStructuredPDF(previewData, documentName, searchTerm) {
    const { rgb, StandardFonts } = require('pdf-lib');

    try {
      console.log('=== generateStructuredPDF START - 3 PARTIES ===');
      console.log('Structure: Première page + Pages avec résultats + Dernière page');
      console.log('previewData received:', {
        documentInfo: previewData.documentInfo,
        searchInfo: previewData.searchInfo,
        previewPagesCount: previewData.previewPages?.length || 0
      });
      
      // Créer un nouveau document PDF
      const newPdfDoc = await PDFDocument.create();
      console.log('PDF document created successfully');
      
      // Charger le document original si possible pour copier les pages
      let originalPdfDoc = null;
      let originalPages = [];
      
      const physicalPath = previewData.documentInfo?.physicalPath;
      if (physicalPath && 
          physicalPath !== 'Document non trouvé localement' &&
          physicalPath !== 'N/A' &&
          fs.existsSync(physicalPath)) {
        
        try {
          console.log('Loading original PDF from:', physicalPath);
          const originalPdfBytes = fs.readFileSync(physicalPath);
          originalPdfDoc = await PDFDocument.load(originalPdfBytes);
          originalPages = originalPdfDoc.getPages();
          console.log(`Original PDF loaded with ${originalPages.length} pages`);
        } catch (loadError) {
          console.log('Failed to load original PDF:', loadError.message);
        }
      } else {
        console.log('No valid physical path for original document');
      }

      // Charger les polices pour les pages de fallback (si nécessaire)
      const font = await newPdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await newPdfDoc.embedFont(StandardFonts.HelveticaBold);
       // Système de déduplication : tracker les pages déjà ajoutées
      const addedPages = new Set();
      const totalPages = originalPages ? originalPages.length : 0;
      
      console.log(`=== PDF Structure Plan ===`);
      console.log(`Total pages in original: ${totalPages}`);
      
      // Analyser les pages avec résultats pour détecter les conflits potentiels
      const pagesWithMatches = previewData.previewPages?.filter(p => p.hasMatches) || [];
      const matchPageNumbers = pagesWithMatches.map(p => p.pageNumber);
      
      console.log(`Pages with search results: ${pagesWithMatches.length} - [${matchPageNumbers.join(', ')}]`);
      console.log(`First page conflicts: ${matchPageNumbers.includes(1) ? 'YES' : 'NO'}`);
      console.log(`Last page conflicts: ${matchPageNumbers.includes(totalPages) ? 'YES' : 'NO'}`);
      
      // PARTIE 1: PREMIÈRE PAGE du document original (seulement si pas déjà dans les résultats)
      console.log('=== PARTIE 1: PREMIÈRE PAGE ===');
      const firstPageHasMatches = matchPageNumbers.includes(1);
      
      if (!firstPageHasMatches) {
        console.log('Adding FIRST page of original document (no search results on this page)...');
        if (originalPdfDoc && originalPages && originalPages.length > 0) {
          try {
            const [firstPage] = await newPdfDoc.copyPages(originalPdfDoc, [0]);
            newPdfDoc.addPage(firstPage);
            addedPages.add(1);
            console.log('✅ First page added successfully (Page 1)');
          } catch (firstPageError) {
            console.error('❌ Error copying first page:', firstPageError.message);
            this.createFallbackPage(newPdfDoc, 'PREMIÈRE PAGE - Non disponible', documentName, font, boldFont);
          }
        } else {
          console.log('No original document available, creating info page for first page');
          this.createFallbackPage(newPdfDoc, 'PREMIÈRE PAGE - Document non accessible', documentName, font, boldFont);
        }
      } else {
        console.log('⚠️ Skipping separate first page - it contains search results and will be included in Part 2');
      }

      // PARTIE 2: PAGES AVEC RÉSULTATS DE RECHERCHE
      console.log('=== PARTIE 2: PAGES AVEC RÉSULTATS ===');
      if (pagesWithMatches.length > 0) {
        console.log(`Processing ${pagesWithMatches.length} pages with search results...`);

        for (const page of pagesWithMatches) {
          const pageNumber = page.pageNumber;
          
          // Vérifier si cette page n'a pas déjà été ajoutée
          if (addedPages.has(pageNumber)) {
            console.log(`⚠️ Skipping page ${pageNumber} - already added`);
            continue;
          }
          
          let pageAdded = false;
          
          // Essayer de copier la page originale avec correspondances
          if (originalPdfDoc && originalPages[pageNumber - 1]) {
            try {
              console.log(`Adding page ${pageNumber} with ${page.matchCount || 'unknown'} matches...`);
              const [copiedPage] = await newPdfDoc.copyPages(originalPdfDoc, [pageNumber - 1]);
              newPdfDoc.addPage(copiedPage);
              addedPages.add(pageNumber);
              console.log(`✅ Copied original page ${pageNumber} with search results`);
              pageAdded = true;
            } catch (copyError) {
              console.log(`❌ Failed to copy page ${pageNumber}:`, copyError.message);
            }
          }
          
          // Si la copie a échoué, créer une page de contenu texte avec les résultats
          if (!pageAdded) {
            const contentPage = newPdfDoc.addPage([612, 792]);
            
            // En-tête de page avec information de correspondances
            contentPage.drawText(`Page ${pageNumber} - RÉSULTATS DE RECHERCHE`, {
              x: 50,
              y: 750,
              size: 14,
              font: boldFont,
              color: rgb(0, 0, 0.8)
            });
            
            if (page.hasMatches) {
              contentPage.drawText(`🔍 ${page.matchCount || 0} correspondance(s) trouvée(s) pour "${searchTerm}"`, {
                x: 50,
                y: 730,
                size: 10,
                font: font,
                color: rgb(0.8, 0, 0)
              });
            }
            
            // Contenu de la page (limité et formaté)
            const content = (page.content || '').substring(0, 2000);
            const lines = content.split('\n');
            let yPosition = 700;
            
            lines.forEach((line) => {
              if (yPosition > 50 && line.trim()) {
                const trimmedLine = line.substring(0, 80);
                contentPage.drawText(trimmedLine, {
                  x: 50,
                  y: yPosition,
                  size: 10,
                  font: font,
                  color: rgb(0, 0, 0)
                });
                yPosition -= 15;
              }
            });
            
            addedPages.add(pageNumber);
            console.log(`✅ Created fallback content page for page ${pageNumber}`);
          }
        }
      } else {
        console.log('No pages with search results found, adding info page');
        const noResultsPage = newPdfDoc.addPage([612, 792]);
        noResultsPage.drawText('AUCUN RÉSULTAT TROUVÉ', {
          x: 50,
          y: 400,
          size: 16,
          font: boldFont,
          color: rgb(0.8, 0, 0)
        });
        noResultsPage.drawText(`Terme recherché: "${searchTerm}"`, {
          x: 50,
          y: 360,
          size: 12,
          font: font,
          color: rgb(0, 0, 0)
        });
      }

      // PARTIE 3: DERNIÈRE PAGE du document original (seulement si pas déjà dans les résultats)
      console.log('=== PARTIE 3: DERNIÈRE PAGE ===');
      const lastPageHasMatches = matchPageNumbers.includes(totalPages);
      const isLastPageSameAsFirst = (totalPages === 1);
      
      if (!lastPageHasMatches && !isLastPageSameAsFirst && totalPages > 0) {
        console.log(`Adding LAST page of original document (page ${totalPages}, no search results on this page)...`);
        if (originalPdfDoc && originalPages && originalPages.length > 0) {
          try {
            const lastPageIndex = originalPages.length - 1;
            const [lastPage] = await newPdfDoc.copyPages(originalPdfDoc, [lastPageIndex]);
            newPdfDoc.addPage(lastPage);
            addedPages.add(totalPages);
            console.log(`✅ Last page added successfully (page ${lastPageIndex + 1})`);
          } catch (lastPageError) {
            console.error('❌ Error copying last page:', lastPageError.message);
            this.createFallbackPage(newPdfDoc, 'DERNIÈRE PAGE - Non disponible', documentName, font, boldFont);
          }
        } else {
          console.log('No original document available, creating info page for last page');
          this.createFallbackPage(newPdfDoc, 'DERNIÈRE PAGE - Document non accessible', documentName, font, boldFont);
        }
      } else if (lastPageHasMatches) {
        console.log('⚠️ Skipping separate last page - it contains search results and was included in Part 2');
      } else if (isLastPageSameAsFirst) {
        console.log('⚠️ Skipping last page - document has only one page (same as first)');
      } else {
        console.log('⚠️ Skipping last page - no valid original document');
      }

      // Générer et retourner le PDF final
      console.log(`=== RÉSUMÉ DE GÉNÉRATION ===`);
      console.log(`Pages uniques ajoutées: ${addedPages.size} - [${Array.from(addedPages).sort((a, b) => a - b).join(', ')}]`);
      console.log(`Total pages dans le PDF final: ${newPdfDoc.getPageCount()}`);
      console.log(`Structure: ${!firstPageHasMatches ? '✅ Première page' : '⚠️ Première page (incluse dans résultats)'} ✅ ${pagesWithMatches.length} page(s) résultats ${!lastPageHasMatches && !isLastPageSameAsFirst ? '✅ Dernière page' : '⚠️ Dernière page (incluse dans résultats ou identique)'}`);
      
      const pdfBytes = await newPdfDoc.save();
      console.log(`=== generateStructuredPDF END - Generated ${pdfBytes.length} bytes ===`);
      
      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('Error generating structured PDF:', {
        message: error.message,
        documentName,
        searchTerm,
        stack: error.stack
      });
      throw error;
    }
  },

  // Méthode utilitaire pour créer une page de fallback
  createFallbackPage(pdfDoc, title, documentName, font, boldFont) {
    const { rgb } = require('pdf-lib');
    const infoPage = pdfDoc.addPage([612, 792]);
    infoPage.drawText(title, {
      x: 50,
      y: 400,
      size: 16,
      font: boldFont,
      color: rgb(0.8, 0, 0)
    });
    infoPage.drawText(`Document: ${documentName}`, {
      x: 50,
      y: 360,
      size: 12,
      font: font,
      color: rgb(0, 0, 0)
    });
    return infoPage;
  },

  // Méthode utilitaire pour wrapper le texte
  wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    // Estimation simple basée sur la longueur des caractères
    const avgCharWidth = fontSize * 0.6; // Approximation pour Helvetica
    const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  },

  // Méthode utilitaire pour mettre en évidence les correspondances
  highlightMatches(content, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const matches = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        text: match[1],
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        context: content.substring(Math.max(0, match.index - 50), Math.min(content.length, match.index + match[1].length + 50))
      });
    }
    
    return matches;
  }
};

module.exports = searchService;