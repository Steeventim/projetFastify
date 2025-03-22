const etapeController = require('../controllers/etapeController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Affect an etape to a document
  fastify.post('/etapes/affect', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ],
    schema: {
      body: {
        type: 'object',
        required: ['etapeName', 'documentId'],
        properties: {
          etapeName: { type: 'string' },
          documentId: { type: 'string', format: 'uuid' },
          typeProjetLibelle: { type: 'string' }
        }
      }
    }
  }, etapeController.affectEtapeToDocument);

  // Get all etapes
  fastify.get('/etapes/all', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ],
  }, etapeController.getAllEtapes);

  // Create a new etape
  fastify.post('/etapes', {
    schema: {
      body: {
        oneOf: [
          // Single object schema
          {
            type: 'object',
            required: ['LibelleEtape'],
            properties: {
              LibelleEtape: { type: 'string' },
              Description: { type: 'string' },
              Validation: { type: ['string', 'boolean'] },
              typeProjetLibelle: { type: 'string' }
            }
          },
          // Array schema
          {
            type: 'array',
            items: {
              type: 'object',
              required: ['LibelleEtape'],
              properties: {
                LibelleEtape: { type: 'string' },
                Description: { type: 'string' },
                Validation: { type: ['string', 'boolean'] },
                typeProjetLibelle: { type: 'string' }
              }
            }
          }
        ]
      }
    },
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])],
  }, etapeController.createEtape);

  // Get etapes by TypeProjet
  fastify.get('/etapes/type-projet/:typeProjetId', {
  }, etapeController.getEtapesByTypeProjet);

  // Get single etape by ID
  fastify.get('/etapes/:etapeId', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ],
    schema: {
      params: {
        type: 'object',
        required: ['etapeId'],
        properties: {
          etapeId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, etapeController.getEtapeById);

  // Get users of next etape
  fastify.get('/etapes/:etapeId/next-users', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin', 'user'])
    ],
    schema: {
      params: {
        type: 'object',
        required: ['etapeId'],
        properties: {
          etapeId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, etapeController.getUsersOfNextEtape);

  // Add route to get etapes by role name
  fastify.get('/etapes/role/:roleName', {
    schema: {
      params: {
        type: 'object',
        required: ['roleName'],
        properties: {
          roleName: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            role: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' }
              }
            },
            count: { type: 'number' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  idEtape: { type: 'string' },
                  LibelleEtape: { type: 'string' },
                  Description: { type: 'string' },
                  sequenceNumber: { type: 'number' },
                  Validation: { type: 'boolean' },
                  typeProjets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        idType: { type: 'string' },
                        Libelle: { type: 'string' },
                        Description: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: [authMiddleware.verifyToken]
  }, etapeController.getEtapesByRoleName);

  // Delete etape
  fastify.delete('/etapes/delete/:etapeId', {
    preHandler: [
      authMiddleware.verifyToken,
      authMiddleware.requireRole(['admin'])
    ],
    schema: {
      params: {
        type: 'object',
        required: ['etapeId'],
        properties: {
          etapeId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, etapeController.deleteEtape);
};
