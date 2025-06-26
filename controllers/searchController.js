const axios = require('axios');
const { Document } = require('../models');
const { v4: uuidv4, validate: isUUID } = require('uuid');
const searchService = require('../services/searchService');
const PDFKit = require('pdfkit');
const { sequelize } = require('../models'); // Assuming sequelize is exported from models

const searchController = {
  searchDocumentsWithoutName: async (request, reply) => {
    const { searchTerm } = request.params;

    if (!searchTerm) {
      return reply.code(400).send({ error: 'Search term is required' });
    }

    try {
      const apiBaseUrl = 'http://localhost:3000';
      const searchUrl = `${apiBaseUrl}/api/v1/pdf/highlight/${encodeURIComponent(searchTerm)}`;
      console.log('Attempting API call to:', searchUrl);

      const response = await axios({
        method: 'get',
        url: searchUrl,
        responseType: 'stream',
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          'Accept': 'application/pdf'
        },
        validateStatus: function(status) {
          return status >= 200 && status < 500;
        }
      });

      if (response.status === 404) {        return reply.code(404).send({
        error: 'Document not found',
        searchTerm
      });
      }

      if (response.status !== 200) {        return reply.code(response.status).send({
        error: 'Unexpected API response',
        status: response.status
      });
      }

      // Set headers for streaming response
      reply.raw.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="search-${searchTerm}.pdf"`,
        'Transfer-Encoding': 'chunked'
      });

      // Handle stream errors
      response.data.on('error', (err) => {
        console.error('Stream error:', err);
        if (!reply.sent) {          reply.code(500).send({
          error: 'Stream error',
          details: err.message
        });
        }
      });

      // Pipe the response stream directly to the reply
      return response.data.pipe(reply.raw);

    } catch (error) {
      console.error('API Call Failed:', {
        message: error.message,
        code: error.code,
        url: error.config?.url
      });

      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          error: 'External search service unavailable',
          details: 'Could not connect to search service'
        });
      }      return reply.code(500).send({
        error: 'Search service error',
        details: error.message
      });
    }
  },

  searchDocuments: async (request, reply) => {
    const { documentName, searchTerm } = request.params;

    if (!documentName || !searchTerm) {
      return reply.code(400).send({ error: 'Document name and search term are required' });
    }

    try {
      const baseUrl = 'http://localhost:3000';
      const encodedDocName = encodeURIComponent(documentName);
      const encodedSearchTerm = encodeURIComponent(searchTerm);

      // Get highlighted PDF first
      const pdfUrl = `${baseUrl}/highlightera2/${encodedDocName}/${encodedSearchTerm}`;
      console.log('Calling external API:', pdfUrl);

      try {
        const response = await axios.get(pdfUrl, { 
          responseType: 'stream',
          timeout: 10000,
          headers: {
            'Accept': 'application/pdf'
          },
          // Add validation for response status
          validateStatus: function(status) {
            return status >= 200 && status < 500;
          }
        });

        if (response.status === 404) {
          return reply.code(404).send({ 
            success: false,
            error: 'Not Found',
            message: 'Document not found or search term not found in document',
            details: {
              documentName,
              searchTerm
            }
          });
        }

        // Modify URL construction to include search term
        const documentUrl = new URL(`/documents/${encodedDocName}/search/${encodedSearchTerm}`, baseUrl).toString();
        
        // Find or create document with UUID validation
        let document = await Document.findOne({
          where: { url: documentUrl }
        });

        if (!document) {
          const newId = uuidv4();
          // Validate UUID format
          if (!isUUID(newId)) {
            throw new Error('Invalid UUID generated');
          }

          document = await Document.create({
            idDocument: newId,
            Title: documentName,
            url: documentUrl,
            status: 'indexed',
            transferStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          // Validate existing document UUID
          if (!isUUID(document.idDocument)) {
            console.warn('Invalid UUID format found in database:', document.idDocument);
            return reply.code(500).send({
              success: false,
              error: 'Data Integrity Error',
              message: 'Invalid document ID format in database'
            });
          }
        }

        // Set response headers
        reply.type('application/pdf');
        reply.header('Document-Id', document.idDocument);
        reply.header('Document-Url', documentUrl);
        reply.header('Document-Status', document.status);

        return reply.send(response.data);

      } catch (apiError) {
        console.error('External API error:', {
          url: pdfUrl,
          status: apiError.response?.status,
          message: apiError.message
        });

        if (apiError.response?.status === 404) {
          return reply.code(404).send({
            success: false,
            error: 'Not Found',
            message: 'Document not found in external service'
          });
        }

        throw apiError; // Re-throw for general error handling
      }

    } catch (error) {
      console.error('Search error:', {
        message: error.message,
        documentName,
        searchTerm,
        stack: error.stack
      });

      return reply.code(503).send({ 
        success: false,
        error: 'Search Service Error',
        message: 'Unable to process search request',
        details: error.message
      });
    }
  },

  searchPropositions: async (request, reply) => {
    try {
      const { searchTerm } = request.params;
      
      if (!searchTerm) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Search term is required'
        });
      }

      const response = await searchService.searchWithHighlight(searchTerm);
      
      if (!response || response.hits.total.value === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'No results found for the search term',
          searchTerm
        });
      }

      return reply.send({
        success: true,
        searchTerm: searchTerm,
        query: {
          original: searchTerm,
          encoded: encodeURIComponent(searchTerm)
        },
        data: response
      });    } catch (error) {
      console.error('Error searching propositions:', {
        error: error.message,
        searchTerm: request.params?.searchTerm || 'unknown',
      });

      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Search service is currently unavailable'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process search request',
        details: error.message
      });
    }
  },  highlightDocument: async (request, reply) => {
    const t = await sequelize.transaction();

    try {
      let { documentName, searchTerm } = request.params;
      
      // Make sure the document name is properly decoded
      // Some URLs might be double-encoded, so decode multiple times if needed
      try {
        documentName = decodeURIComponent(documentName);
        // Check if still contains encoded characters
        if (documentName.includes('%')) {
          documentName = decodeURIComponent(documentName);
        }
      } catch (e) {
        console.warn('Error decoding document name:', e.message);
        // Continue with the original name if decoding fails
      }
      
      // Also ensure searchTerm is properly decoded
      try {
        searchTerm = decodeURIComponent(searchTerm);
      } catch (e) {
        console.warn('Error decoding search term:', e.message);
      }
      
      console.log('Processing document request with params:', {
        documentName,
        searchTerm
      });
      
      const space = ' ' + searchTerm.toLowerCase();
      const lowerSearchTerm = space;
      const baseUrl = process.env.BASE_URL || 'http://localhost:3003';

      // Construct document URL with search term
      const encodedDocName = encodeURIComponent(documentName);
      const encodedSearchTerm = encodeURIComponent(searchTerm);
      const documentUrl = new URL(`/documents/${encodedDocName}/search/${encodedSearchTerm}`, baseUrl).toString();

      // Check if document already exists with this URL
      let document = await Document.findOne({
        where: { url: documentUrl },
        transaction: t
      });

      const searchResponse = await searchService.searchWithHighlight(lowerSearchTerm);

      if (!searchResponse || searchResponse.hits.hits.length === 0) {
        await t.rollback();
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      const pdfBytes = await searchService.searchDocumentWithHighlight(documentName, searchTerm);

      if (!pdfBytes) {
        const doc = new PDFKit();
        reply.type('application/pdf');
        doc.pipe(reply.raw);

        const content = searchResponse.hits.hits[0]._source.content;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        const parts = content.split(regex);

        parts.forEach(part => {
          if (part.toLowerCase() === lowerSearchTerm) {
            doc.fillColor('red').text(part, { continued: true });
          } else {
            doc.fillColor('black').text(part, { continued: true });
          }
        });

        if (!document) {
          document = await Document.create({
            idDocument: uuidv4(),
            Title: documentName,
            url: documentUrl,
            status: 'indexed',
            transferStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          }, { transaction: t });
        } else {
          await document.update({
            updatedAt: new Date()
          }, { transaction: t });
        }

        await t.commit();
        doc.end();
        return;
      }

      // If PDF exists and document record doesn't exist, create it
      if (!document) {
        document = await Document.create({
          idDocument: uuidv4(),
          Title: documentName,
          url: documentUrl,
          status: 'indexed',
          transferStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }, { transaction: t });
      } else {
        await document.update({
          updatedAt: new Date()
        }, { transaction: t });
      }

      await t.commit();
      reply.type('application/pdf');
      return reply.send(Buffer.from(pdfBytes));

    } catch (error) {
      await t.rollback();
      console.error('Error highlighting document:', error);

      if (error.message === 'Document not found') {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Document not found'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process document highlighting',
        details: error.message
      });
    }
  }
};

module.exports = searchController;
