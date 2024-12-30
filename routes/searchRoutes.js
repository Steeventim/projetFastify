const searchController = require('../controllers/searchController');

async function routes(fastify, options) {
  fastify.get('/search/:documentName/:searchTerm', searchController.searchDocuments);
}

module.exports = routes;