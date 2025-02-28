const { Commentaire, User } = require('../models');

const commentaireController = {
  createCommentaire: async (request, reply) => {
    const { content, userId, documentId, UserDestinatorName } = request.body;

    try {
      const newCommentaire = await Commentaire.create({
        UserDestinatorName, // Add UserDestinatorName to the comment
        content,
        userId,
        structureId,
        documentId
      });

      return reply.status(201).send(newCommentaire);
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  },

  updateCommentaire: async (request, reply) => {
    const { idCommentaire } = request.params;
    const { content } = request.body;

    try {
      const [updated] = await Commentaire.update(
        { content },
        { where: { idCommentaire } }
      );

      if (!updated) {
        return reply.status(404).send({ error: 'Commentaire not found' });
      }

      return reply.send({ message: 'Commentaire updated successfully' });
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  },

  deleteCommentaire: async (request, reply) => {
    const { idCommentaire } = request.params;

    try {
      const deleted = await Commentaire.destroy({ where: { idCommentaire } });

      if (!deleted) {
        return reply.status(404).send({ error: 'Commentaire not found' });
      }

      return reply.status(204).send(); // No content
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  }
};

module.exports = commentaireController;
