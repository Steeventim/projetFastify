const projetController = require('../controllers/projetController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Create a new projet
  fastify.post('/projets', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, projetController.createProjet);
};
