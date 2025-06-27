const searchController = require('../controllers/searchController');

async function searchRoutes(fastify, options) {
  fastify.get('/search-without-name/:searchTerm', async (request, reply) => {
    try {
      await searchController.searchDocumentsWithoutName(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.get('/search/:documentName/:searchTerm', async (request, reply) => {
    try {
      const { documentName, searchTerm } = request.params;
      const { etapeName } = request.query;
      
      await searchController.searchDocuments(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Add wrapper for proposition search with proper parameter validation
  fastify.get('/search-propositions/:searchTerm', {
    schema: {
      params: {
        type: 'object',
        required: ['searchTerm'],
        properties: {
          searchTerm: { 
            type: 'string',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Decode the search term before passing to controller
      request.params.searchTerm = decodeURIComponent(request.params.searchTerm);
      await searchController.searchPropositions(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });

  // Convert to GET route only for search1Highligth
  fastify.get('/search1Highligth/:searchTerm', {
    schema: {
      params: {
        type: 'object',
        required: ['searchTerm'],
        properties: {
          searchTerm: { 
            type: 'string',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      request.params.searchTerm = decodeURIComponent(request.params.searchTerm);
      const response = await searchController.searchPropositions(request, reply);
      return response;
    } catch (error) {
      fastify.log.error('Search error:', {
        method: request.method,
        searchTerm: request.params.searchTerm,
        error: error.message
      });
      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Elasticsearch service is not available'
        });
      }
      return reply.status(500).send({ 
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });
  // Convert to GET route only for highlightera2
  fastify.get('/highlightera2/*', async (request, reply) => {
    try {
      // Remove leading slash and split by last slash to get documentName and searchTerm
      const path = request.params['*'] || '';
      const lastSlash = path.lastIndexOf('/');
      if (lastSlash === -1) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Document name and search term are required'
        });
      }
      let documentName = path.substring(0, lastSlash);
      let searchTerm = path.substring(lastSlash + 1);
      // Log for debugging
      console.log('Wildcard highlightera2 request:', { documentName, searchTerm, url: request.url });
      // Attach to params for controller compatibility
      request.params.documentName = documentName;
      request.params.searchTerm = searchTerm;
      await searchController.highlightDocument(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(`Error in wildcard highlightera2 route: ${error.message}`);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}

module.exports = searchRoutes;
