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
        required: ['documentName', 'etapeName'],
        properties: {
          documentName: { type: 'string' },
          etapeName: { type: 'string' }
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

  // Add new route to get forwarded document details
  fastify.get('/forwarded-document/:documentId/:userId', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user']),
    ],
    schema: {
      params: {
        type: 'object',
        required: ['documentId', 'userId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, documentController.getForwardedDocumentDetails);

  // Add new route for forwarding to next etape
  fastify.post('/forward-to-next-etape', {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['documentId', 'userId', 'etapeId', 'nextEtapeName'],
        properties: {
          documentId: { 
            type: 'string',
            format: 'uuid'
          },
          userId: { 
            type: 'string',
            format: 'uuid'
          },
          etapeId: { 
            type: 'string',
            format: 'uuid'
          },
          nextEtapeName: { type: 'string' },
          UserDestinatorName: { type: 'string' },
          'comments.*.content': { type: 'string' },  // Handle array of comments
          'files.*': {  // Handle array of files
            type: 'object',
            properties: {
              filename: { type: 'string' },
              mimetype: { type: 'string' },
              encoding: { type: 'string' }
            }
          }
        },
        additionalProperties: true  // Allow additional properties for multipart data
      }
    },
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ]
  }, documentController.forwardToNextEtape);

  // Add new route for approving document
  fastify.post('/approve-document', {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['documentId', 'userId', 'etapeId'],
        properties: {
          documentId: { 
            type: 'string',
            format: 'uuid'
          },
          userId: { 
            type: 'string',
            format: 'uuid'
          },
          etapeId: { 
            type: 'string',
            format: 'uuid'
          },
          'comments.*.content': { type: 'string' },
          'files.*': {
            type: 'object',
            properties: {
              filename: { type: 'string' },
              mimetype: { type: 'string' },
              encoding: { type: 'string' }
            }
          }
        },
        additionalProperties: true
      }
    },
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ]
  }, documentController.approveDocument);

  // Add new route for received documents
  fastify.get('/received-documents/:userId', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' }
        }
      }
    },
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ]
  }, documentController.getReceivedDocuments);
};