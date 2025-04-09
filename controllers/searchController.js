const axios = require('axios');
const { Document, Etape } = require('../models');
const { Readable } = require('stream');
const { v4: uuidv4, validate: isUUID } = require('uuid');  // Add validate import

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

      if (response.status === 404) {
        return reply.code(404).send({ 
          error: 'Document not found',
          searchTerm 
        });
      }

      if (response.status !== 200) {
        return reply.code(response.status).send({ 
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
        if (!reply.sent) {
          reply.code(500).send({ 
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
      }

      return reply.code(500).send({ 
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

      // Define base URL and properly encode the full search term
      const baseUrl = 'http://localhost:3000';
      const encodedSearchTerm = encodeURIComponent(searchTerm);
      const apiUrl = `${baseUrl}/search1Highligth/${encodedSearchTerm}`;

      console.log('Search request details:', {
        originalTerm: searchTerm,
        encodedTerm: encodedSearchTerm,
        fullUrl: apiUrl
      });

      // Add proper timeout and error handling
      const response = await axios.get(apiUrl, {
        timeout: 30000,
        validateStatus: function(status) {
          return status >= 200 && status < 500;
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: 'json'
      });

      console.log('External API response:', {
        status: response.status,
        contentType: response.headers['content-type'],
        dataLength: response.data ? JSON.stringify(response.data).length : 0
      });

      // Handle different response statuses
      if (response.status === 404) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'No results found for the search term',
          searchTerm
        });
      }

      if (response.status !== 200) {
        throw new Error(`External API returned status ${response.status}`);
      }

      // Ensure we have a valid response
      if (!response.data) {
        throw new Error('External API returned no data');
      }

      // Send the response with proper structure
      return reply.send({
        success: true,
        searchTerm: searchTerm,
        query: {
          original: searchTerm,
          encoded: encodedSearchTerm
        },
        data: response.data
      });

    } catch (error) {
      console.error('Error searching propositions:', {
        error: error.message,
        searchTerm,
        status: error.response?.status,
        data: error.response?.data
      });

      // Handle specific error cases
      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Search service is currently unavailable'
        });
      }

      if (error.response?.status === 404) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'No results found',
          searchTerm: searchTerm
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to process search request',
        details: error.message
      });
    }
  }
};

module.exports = searchController;
