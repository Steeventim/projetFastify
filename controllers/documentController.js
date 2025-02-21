const { Document, User, Commentaire, File, Etape } = require('../models');

const documentController = {
  verifyDocumentStatus: async (document) => {
    try {
      const isComplete = await document.checkEtapeCompletion();
      if (isComplete) {
        document.status = 'verified';
      } else {
        document.status = document.status === 'rejected' ? 'rejected' : 'pending';
      }
      await document.save();
      return document;
    } catch (error) {
      throw new Error(`Error verifying document status: ${error.message}`);
    }
  },


  forwardDocument: async (request, reply) => {
    const { documentId, userId, comments, files } = request.body;
    const transferTimestamp = new Date();

    try {
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

      const user = await User.findByPk(userId);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

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

      const etape = await Etape.findByPk(document.etapeId);
      if (etape) {
        await verifyDocumentStatus(document);
      }


      document.transferStatus = 'sent';
      document.transferTimestamp = transferTimestamp;
      await document.save();

      return reply.status(200).send({ 
        document,
        user,
        transferStatus: 'sent',
        transferTimestamp
      });

    } catch (error) {
      console.error('Error forwarding document:', error.message);
      return reply.status(500).send({ error: 'Error forwarding document', details: error.message });
    }
  },

  viewDocument: async (request, reply) => {
    const { documentId } = request.params;
    
    try {
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

      if (document.transferStatus === 'received') {
        document.transferStatus = 'viewed';
        document.transferTimestamp = new Date();
        await document.save();
      }
      await verifyDocumentStatus(document);


      return reply.status(200).send(document);
    } catch (error) {
      console.error('Error viewing document:', error.message);
      return reply.status(500).send({ error: 'Error viewing document', details: error.message });
    }
  }
};

module.exports = documentController;
