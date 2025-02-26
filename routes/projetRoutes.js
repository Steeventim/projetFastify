const projetController = require('../controllers/projetController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Get all projets
  fastify.get('/projets/all', {
    preHandler: [authMiddleware.verifyToken]
  }, projetController.getAllTypeProjets);

  // Create a new projet
  fastify.post('/projets', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, projetController.createTypeProjet);
};
