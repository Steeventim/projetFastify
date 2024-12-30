const fastify = require('fastify')();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to forward a document to another user
fastify.post('/forward-document', { preHandler: authMiddleware }, documentController.forwardDocument);

module.exports = fastify;
