const searchController = require('../controllers/searchController');
const authMiddleware = require('../middleware/authMiddleware');

async function routes(fastify, options) {
  fastify.get('/search/:documentName/:searchTerm', { 
    preHandler: [authMiddleware.verifyToken] 
  }, searchController.searchDocuments);
}

module.exports = routes;