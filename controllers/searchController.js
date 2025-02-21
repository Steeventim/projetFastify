const axios = require('axios');
const { Document, Etape } = require('../models');

const searchController = {
  searchDocumentsWithoutName: async (request, reply) => {
    const { searchTerm } = request.params;

    if (!searchTerm) {
      return reply.code(400).send({ error: 'Search term is required' });
    }

    try {
      const apiBaseUrl = 'http://localhost:3001';
      // Remove /api/ prefix and use consistent URL format
      const searchUrl = `${apiBaseUrl}/highlightera2/${searchTerm}`;
      console.log('Attempting API call to:', searchUrl);

      const response = await axios.get(searchUrl, { 
        responseType: 'stream', // Set to stream for PDF
        timeout: 10000,
        headers: {
          'Accept': 'application/pdf'
        },
        validateStatus: null // Allow all status codes to be handled in our code
      });

      console.log('API Response Status:', response.status);

      if (response.status === 404) {
        console.log('API returned 404 - Document not found');
        return reply.code(404).send({ 
          error: 'Document not found', 
          searchTerm 
        });
      }

      if (response.status !== 200) {
        console.log(`API returned unexpected status: ${response.status}`);
        return reply.code(response.status).send({
          error: 'Unexpected API response'
        });
      }

      // Stream PDF response
      reply.type('application/pdf');
      return reply.send(response.data);

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
      const pdfUrl = `http://localhost:3001/highlightera2/${documentName}/${searchTerm}`;
      console.log('Calling external API:', pdfUrl);

      const response = await axios.get(pdfUrl, { 
        responseType: 'stream',
        timeout: 10000
      });

      reply.type('application/pdf');
      return reply.send(response.data);

    } catch (error) {
      console.error('External API error:', error.message);
      return reply.code(503).send({ 
        error: 'External search service error', 
        details: error.message 
      });
    }
  }
};

module.exports = searchController;
