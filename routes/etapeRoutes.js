const etapeController = require('../controllers/etapeController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Create a new etape
  fastify.post('/etapes', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, etapeController.createEtape);
};
