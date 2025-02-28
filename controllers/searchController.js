const axios = require('axios');
const { Document, Etape } = require('../models');
const { Readable } = require('stream');

const searchController = {
  searchDocumentsWithoutName: async (request, reply) => {
    const { searchTerm } = request.params;

    if (!searchTerm) {
      return reply.code(400).send({ error: 'Search term is required' });
    }

    try {
      const apiBaseUrl = 'http://localhost:3001';
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
      const baseUrl = 'http://localhost:3001';
      const encodedDocName = encodeURIComponent(documentName);
      const encodedSearchTerm = encodeURIComponent(searchTerm);
      const pdfUrl = `${baseUrl}/highlightera2/${encodedDocName}/${encodedSearchTerm}`;
      console.log('Calling external API:', pdfUrl);

      const response = await axios.get(pdfUrl, { 
        responseType: 'stream',
        timeout: 10000,
        headers: {
          'Accept': 'application/pdf'
        }
      });

      // Create a properly formatted document URL
      const documentUrl = new URL(`/documents/${encodedDocName}`, baseUrl).toString();

      // Find or create document in database
      let document = await Document.findOne({
        where: { Title: documentName }
      });

      if (!document) {
        document = await Document.create({
          idDocument: uuidv4(),
          Title: documentName,
          url: documentUrl,
          status: 'pending',
          transferStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        await document.update({
          url: documentUrl,
          status: 'pending',
          updatedAt: new Date()
        });
      }

      // Set response headers
      reply.type('application/pdf');
      reply.header('Document-Id', document.idDocument);
      reply.header('Document-Url', documentUrl);
      reply.header('Document-Status', document.status);

      return reply.send(response.data);

    } catch (error) {
      console.error('External API error:', {
        message: error.message,
        documentName,
        searchTerm,
        details: error.errors || []
      });

      if (error.name === 'SequelizeValidationError') {
        return reply.code(400).send({ 
          error: 'Validation Error', 
          details: error.errors.map(e => e.message)
        });
      }

      return reply.code(503).send({ 
        error: 'External search service error', 
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

      // Define base URL and construct full URL
      const baseUrl = 'http://localhost:3001'; // Adjust this to match your external API base URL
      const apiUrl = `${baseUrl}/search1Highligth/${encodeURIComponent(searchTerm)}`;

      console.log('Calling external API:', apiUrl);

      // Call the external API using axios instead of fetch
      const response = await axios.get(apiUrl);

      // Check response status
      if (response.status !== 200) {
        throw new Error(`External API returned status ${response.status}`);
      }

      return reply.send({
        success: true,
        data: response.data,
        searchTerm
      });

    } catch (error) {
      console.error('Error searching propositions:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = searchController;
