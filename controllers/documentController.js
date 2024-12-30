const { Document, User, Commentaire, File, Etape } = require('../models'); // Assuming you have Commentaire, File, and Etape models

const documentController = {
  forwardDocument: async (request, reply) => {
    const { documentId, userId, comments, files } = request.body;

    try {
      // Retrieve the document data from the database
      const document = await Document.findByPk(documentId, {
        include: [
          { model: Commentaire, as: 'commentaires' },
          { model: File, as: 'files' },
          { model: Etape, as: 'etape' }
        ]
      });
      if (!document) {
        return reply.status(404).send({ error: 'Document not found' });
      }

      // Check if the user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Attach comments and files to the document if they are provided
      if (comments) {
        for (const comment of comments) {
          await Commentaire.create({ documentId, ...comment });
        }
      }
      if (files) {
        for (const file of files) {
          await File.create({ documentId, ...file });
        }
      }

      // Update the document status based on the Etape
      const etape = await Etape.findByPk(document.etapeId);
      if (etape) {
        document.status = `In ${etape.LibelleEtape}`;
        await document.save();
      }

      // Retrieve the updated document data
      const updatedDocument = await Document.findByPk(documentId, {
        include: [
          { model: Commentaire, as: 'commentaires' },
          { model: File, as: 'files' },
          { model: Etape, as: 'etape' }
        ]
      });

      // Forward the document data to the user (this could be an email, notification, etc.)
      // For simplicity, we'll just return the document data and user info
      return reply.status(200).send({ document: updatedDocument, user });
    } catch (error) {
      console.error('Error forwarding document:', error.message);
      return reply.status(500).send({ error: 'Error forwarding document', details: error.message });
    }
  }
};

module.exports = documentController;