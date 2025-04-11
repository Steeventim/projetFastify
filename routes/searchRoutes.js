const fastify = require('fastify')({ logger: true });
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
  fastify.get('/highlightera2/:documentName/:searchTerm', {
    schema: {
      params: {
        type: 'object',
        required: ['documentName', 'searchTerm'],
        properties: {
          documentName: { type: 'string' },
          searchTerm: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      await searchController.highlightDocument(request, reply);
      return reply;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal Server Error' });
    }
  });
}

module.exports = searchRoutes;
