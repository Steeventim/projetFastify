const etapeController = require('../controllers/etapeController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Get all etapes
  fastify.get('/etapes/all', {
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])]
  }, etapeController.getAllEtapes);

  // Create a new etape
  fastify.post('/etapes', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, etapeController.createEtape);
};
