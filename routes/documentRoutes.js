const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  fastify.post('/forward-document', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])],
    schema: {
      body: {
        type: 'object',
        required: ['documentName', 'userId'],
        properties: {
          documentName: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
          comments: { type: 'array', items: { type: 'object' } },
          files: { type: 'array', items: { type: 'object' } },
          externalUrl: { type: 'string', format: 'uri', nullable: true }
        }
      }
    }
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
};
