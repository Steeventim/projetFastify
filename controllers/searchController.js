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
  },

  async searchPropositions(request, reply) {
    const { searchTerm } = request.params;

    if (!searchTerm) {
      return reply.code(400).send({ error: 'Search term is required' });
    }

    try {
      const apiBaseUrl = 'http://localhost:3001';
      const searchUrl = `${apiBaseUrl}/search1Highligth/${encodeURIComponent(searchTerm)}`;
      console.log('Searching propositions:', searchTerm);

      const response = await axios({
        method: 'get',
        url: searchUrl,
        timeout: 10000,
        validateStatus: null
      });

      if (response.status !== 200) {
        return reply.code(response.status).send({
          error: 'Search service error',
          details: 'Failed to get search results'
        });
      }

      const searchResults = response.data;
      const hits = searchResults.hits?.hits || [];

      // Process and store documents
      for (const hit of hits) {
        const documentUrl = hit._source.url;
        const documentName = hit._source.file?.filename;

        if (documentName && documentUrl) {
          try {
            // Try to find existing document
            const [document, created] = await Document.findOrCreate({
              where: { name: documentName },
              defaults: {
                id: uuidv4(),
                name: documentName,
                url: documentUrl,
                status: 'indexed',
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });

            if (created) {
              console.log(`Stored new document: ${documentName}`);
            } else {
              console.log(`Document already exists: ${documentName}`);
              // Update URL if it's different
              if (document.url !== documentUrl) {
                await document.update({ url: documentUrl });
                console.log(`Updated URL for document: ${documentName}`);
              }
            }
          } catch (dbError) {
            console.error('Error storing document:', {
              name: documentName,
              error: dbError.message
            });
          }
        }
      }

      return reply.send({
        success: true,
        total: searchResults.hits?.total?.value || 0,
        hits: hits.map(hit => ({
          ...hit,
          _source: {
            ...hit._source,
            stored: true // Indicate that document is stored
          }
        })),
        took: searchResults.took
      });

    } catch (error) {
      console.error('Proposition search error:', {
        message: error.message,
        code: error.code
      });

      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          error: 'Search service unavailable'
        });
      }

      return reply.code(500).send({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
};

module.exports = searchController;
