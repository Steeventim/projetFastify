const etapeTypeProjetController = require('../controllers/etapeTypeProjetController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function(fastify, opts) {
  // Get all TypeProjets with their Etapes
  fastify.get('/typeprojets-with-etapes', {
    preHandler: [authMiddleware.verifyToken]
  }, etapeTypeProjetController.getAllTypeProjetsWithEtapes);

  // Assign Etape to TypeProjet
  fastify.post('/assign-etape-type-projet', {
    preHandler: [
      authMiddleware.verifyToken, 
      authMiddleware.requireRole(['admin'])
    ],
    schema: {
      body: {
        type: 'object',
        required: ['etapeId', 'typeProjetId'],
        properties: {
          etapeId: { type: 'string', format: 'uuid' },
          typeProjetId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, etapeTypeProjetController.assignEtapeToTypeProjet);
};
