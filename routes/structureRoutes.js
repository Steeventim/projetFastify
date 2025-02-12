const structureController = require('../controllers/structureController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Create a new structure
  fastify.post('/structures', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, structureController.createStructure);
};
