const etapeTypeProjetController = require('../controllers/etapeTypeProjetController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function(fastify, opts) {
  fastify.post('/assign-etape-type-projet', {
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])]
  }, etapeTypeProjetController.assignEtapeToTypeProjet);
};