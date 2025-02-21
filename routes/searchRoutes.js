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
}

module.exports = searchRoutes;
