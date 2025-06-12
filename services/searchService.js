const { Client } = require('@elastic/elasticsearch');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_PDF_DIRECTORY = process.env.PDF_DIRECTORY || "C:/Users/laure/Desktop/Document";

// Initialize Elasticsearch client with retry and timeout settings
const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://192.168.2.6:9200/',
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
      const response = await esClient.search({
        index: process.env.INDEX || 'test1',
        body: {
          query: {
            match: {
              content: searchTerm
            }
          },
          highlight: {
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
      
      const space = ' ' + searchTerm.toLowerCase();
      const lowerSearchTerm = space;

      console.log('Searching for document:', {
        documentName,
        searchTerm: lowerSearchTerm,
        index: process.env.INDEX || 'test1'
      });

      const searchResponse = await esClient.search({
        index: process.env.INDEX || 'test1',
        query: {
          match: {
            "file.filename": documentName
          }
        },
        highlight: {
          max_analyzed_offset: 2000000,
          fields: {
            content: {}
          }
        }
      });

      console.log('Search query:', documentName);
      console.log('Search response:', JSON.stringify(searchResponse, null, 2));

      if (searchResponse.hits.hits.length === 0) {
        console.log('Document not found:', documentName);
        throw new Error('Document not found');
      }

      const document = searchResponse.hits.hits[0]._source;
      const fileName = document.file.filename;
      const localFilePath = path.join(LOCAL_PDF_DIRECTORY, fileName);

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
      throw error;
    }
  }
};

module.exports = searchService;