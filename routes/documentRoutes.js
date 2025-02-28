const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  fastify.post('/forward-document', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin', 'user'])],
  }, documentController.forwardDocument);

  fastify.get('/document/:documentName', {
    preHandler: [authMiddleware.verifyToken],
    schema: {
      params: {
        type: 'object',
        required: ['documentName'],
        properties: {
          documentName: { type: 'string' }
        }
      }
    }
  }, documentController.viewDocument);

  // Route to assign etape to document
  fastify.post('/assign-etape', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'supervisor'])
    ],
    schema: {
      body: {
        type: 'object',
        required: ['documentName', 'etapeId'],
        properties: {
          documentName: { type: 'string' },
          etapeId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, documentController.assignEtape);

  fastify.get('/forwarded-documents-get/:userId', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, documentController.getForwardedDocuments);
};