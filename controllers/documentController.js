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
    const { documentName, userId, comments, files, externalUrl } = request.body;
    const transferTimestamp = new Date();

    // Validate and store external URL only if it doesn't exist
    if (externalUrl) {
      try {
        // Validate URL format
        new URL(externalUrl);
      } catch (error) {
        return reply.status(400).send({ error: 'Invalid URL format' });
      }
    }

    try {
      const document = await Document.findOne({
        where: { name: documentName },
        include: [
          { model: Commentaire, as: 'commentaires' },
          { model: File, as: 'files' },
          { model: Etape, as: 'etape' }
        ]
      });

      if (!document) {
        return reply.status(404).send({ 
          error: 'Not Found',
          message: `Document "${documentName}" not found` 
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (comments) {
        for (const comment of comments) {
          await Commentaire.create({ documentId: document.id, ...comment });
        }
      }

      if (files) {
        for (const file of files) {
          await File.create({ documentId: document.id, ...file });
        }
      }

      // Store external URL if provided and not already set
      if (externalUrl && !document.url) {
        document.url = externalUrl;
        await document.save();
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
    const { documentName } = request.params;
    
    try {
      const document = await Document.findOne({
        where: { name: documentName },
        include: [
          { model: Commentaire, as: 'commentaires' },
          { model: File, as: 'files' },
          { model: Etape, as: 'etape' }
        ]
      });

      if (!document) {
        return reply.status(404).send({ 
          error: 'Not Found',
          message: `Document "${documentName}" not found` 
        });
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
  },

  assignEtape: async (request, reply) => {
    try {
      const { documentName, etapeId } = request.body;

      if (!documentName || !etapeId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Document name and Etape ID are required'
        });
      }

      // Find the document by name
      const document = await Document.findOne({
        where: { name: documentName }
      });

      if (!document) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Document "${documentName}" not found`
        });
      }

      // Find the etape
      const etape = await Etape.findByPk(etapeId);
      if (!etape) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Etape not found'
        });
      }

      // Update document with new etape
      await document.update({ etapeId });

      // Return updated document with etape information
      const updatedDocument = await Document.findOne({
        where: { name: documentName },
        include: [{
          model: Etape,
          attributes: ['id', 'name', 'description']
        }]
      });

      return reply.send({
        success: true,
        message: 'Etape assigned successfully',
        document: updatedDocument
      });

    } catch (error) {
      console.error('Error assigning etape:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = documentController;
