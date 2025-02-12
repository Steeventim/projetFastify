const commentaireController = require('../controllers/commentaireController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Create a new commentaire
  fastify.post('/commentaires', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['user', 'admin'])] 
  }, commentaireController.createCommentaire);

  // Update a commentaire
  fastify.put('/commentaires/:idCommentaire', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['user', 'admin'])] 
  }, commentaireController.updateCommentaire);

  // Delete a commentaire
  fastify.delete('/commentaires/:idCommentaire', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, commentaireController.deleteCommentaire);
};
