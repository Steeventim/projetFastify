const documentController = require("../controllers/documentController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadConfig = require('../config/upload');

module.exports = async function (fastify, opts) {
  // Forward document
  fastify.post(
    "/forward-document",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['documentId', 'userId', 'etapeId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          etapeId: { type: 'string', format: 'uuid' },
          'comments.*.content': { type: 'string' },
          'files.*': {
            type: 'object',
            properties: {
              filename: { type: 'string' },
              mimetype: { type: 'string' },
              encoding: { type: 'string' }
            }
          }
        }
      }
    }
    },
    documentController.forwardDocument
  );

  // View document
  fastify.get('/document/:documentTitle', {
    preHandler: [authMiddleware.verifyToken],
    schema: {
      params: {
        type: 'object',
        required: ['documentTitle'],
        properties: {
          documentTitle: { type: 'string' }
        }
      }
    }
  }, documentController.viewDocument);

  // Assign etape to document
  fastify.post('/assign-etape', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
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

  // Forward to next etape
  fastify.post('/forward-to-next-etape', {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['documentId', 'userId', 'etapeId', 'nextEtapeName'],
        properties: {
          documentId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          etapeId: { type: 'string', format: 'uuid' },
          nextEtapeName: { type: 'string' },
          UserDestinatorName: { type: 'string' },
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
  }, documentController.forwardToNextEtape);

  // Approve document
  fastify.post('/approve-document', {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        required: ['documentId', 'userId', 'etapeId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          etapeId: { type: 'string', format: 'uuid' },
          'comments.*.content': { type: 'string' },
          'files.*': {
            type: 'object',
            properties: {
              filename: { type: 'string' },
              mimetype: { type: 'string' },
              encoding: { type: 'string' }
            }
          }
        }
      }
    },
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ]
  }, documentController.approveDocument);

  // Get received documents
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

  // Get latest document
  fastify.get('/latest-document', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                idDocument: { type: 'string' },
                Title: { type: 'string' },
                status: { type: 'string' },
                transferStatus: { type: 'string' },
                transferTimestamp: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                commentaires: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      idComment: { type: 'string' },
                      Contenu: { type: 'string' },
                      createdAt: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          idUser: { type: 'string' },
                          NomUser: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      idFile: { type: 'string' },
                      fileName: { type: 'string' },
                      filePath: { type: 'string' },
                      fileType: { type: 'string' },
                      fileSize: { type: 'number' },
                      thumbnailPath: { type: 'string' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' }
                    }
                  }
                },
                etape: {
                  type: 'object',
                  properties: {
                    idEtape: { type: 'string' },
                    LibelleEtape: { type: 'string' },
                    Description: { type: 'string' },
                    sequenceNumber: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, documentController.getLatestDocument);

  // Reject document
  fastify.post('/documents/:documentId/reject', {
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          comments: {
            type: 'array',
            items: {
              type: 'object',
              required: ['content'],
              properties: {
                content: { type: 'string', minLength: 1 }
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                document: { type: 'object' },
                returnedTo: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                  }
                },
                comments: { type: 'array' },
                files: { type: 'array' }
              }
            }
          }
        }
      }
    },
    preHandler: [authMiddleware.verifyToken]
  }, documentController.rejectDocument);
};
