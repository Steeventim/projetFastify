const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Route to forward a document to another user
  fastify.post('/forward-document', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])]
  }, documentController.forwardDocument);
};
