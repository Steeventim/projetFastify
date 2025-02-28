const { Document, User, Commentaire, File, Etape, UserRoles } = require('../models');
const { v4: uuidv4 } = require('uuid');

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
    // Extract fields from request body
    const { 
      documentId,
      userId, 
      comments, 
      files, 
      etapeId,
      UserDestinatorName: providedDestinator 
    } = request.body;
  
    if (!documentId || !etapeId) {
      return reply.status(400).send({ 
        error: 'Bad Request', 
        message: 'Document ID and Etape ID are required' 
      });
    }
  
    const transferTimestamp = new Date();
  
    try {
      const etape = await Etape.findByPk(etapeId);
      if (!etape) {
        return reply.status(404).send({ 
          error: 'Not Found', 
          message: 'Etape not found' 
        });
      }
  
      const nextEtape = await Etape.findOne({ 
        where: { sequenceNumber: etape.sequenceNumber + 1 } 
      });
      let UserDestinatorName = nextEtape ? nextEtape.NomUser : null;
  
      // Find the document by ID
      let document = await Document.findByPk(documentId);
      if (!document) {
        return reply.status(404).send({ 
          error: 'Not Found', 
          message: 'Document not found' 
        });
      }
  
      const user = await User.findByPk(userId);
      if (!user) {
        return reply.status(404).send({ 
          error: 'Not Found', 
          message: 'User not found' 
        });
      }
  
      // Check if user's role is associated with the etape
      const userRole = await UserRoles.findOne({ 
        where: { 
          userId: user.idUser, 
          roleId: etape.roleId 
        } 
      });
      
      if (!userRole) {
        return reply.status(403).send({ 
          error: 'Forbidden', 
          message: 'User does not have permission to forward this document' 
        });
      }
  
      // Add comments if any
      if (comments && Array.isArray(comments)) {
        for (const comment of comments) {
          await Commentaire.create({
            id: uuidv4(),
            documentId: document.idDocument,
            userId: user.idUser,
            content: comment.content,
            createdAt: new Date()
          });
        }
      }
  
      // Logic to send the document to the destinator
      const destinatorUser = await User.findOne({ 
        where: { NomUser: UserDestinatorName } 
      });
      
      if (!destinatorUser) {
        return reply.status(404).send({ 
          error: 'Destinator user not found' 
        });
      }
  
      // Update document status
      document.transferStatus = 'sent';
      document.transferTimestamp = transferTimestamp;
      await document.save();
  
      // Get fresh document data including URL
      const updatedDocument = await Document.findByPk(documentId, {
        attributes: ['idDocument', 'Title', 'url', 'status', 'transferStatus', 'transferTimestamp']
      });
  
      return reply.status(200).send({ 
        success: true,
        destinatorUser: {
          id: destinatorUser.idUser,
          name: destinatorUser.NomUser
        },
        document: updatedDocument,
        user: {
          id: user.idUser,
          name: user.NomUser
        },
        transferStatus: 'sent', 
        transferTimestamp 
      });
  
    } catch (error) {
      console.error('Error forwarding document:', error.message);
      return reply.status(500).send({ 
        error: 'Error forwarding document', 
        details: error.message 
      });
    }
  },
  viewDocument: async (request, reply) => {
    const { documentTitle } = request.params;
    
    try {
      const document = await Document.findOne({
        where: { Title: documentTitle },
        include: [
          { model: Commentaire, as: 'commentaires' },
          { model: File, as: 'files' },
          { model: Etape, as: 'etape' }
        ]
      }).catch(error => {
        console.error('Error fetching document:', error);
        return null; // Return null if there's an error
      });

      if (!document) {
        return reply.status(404).send({ 
          error: 'Not Found',
          message: `Document "${documentTitle}" not found` 
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

  getForwardedDocuments: async (request, reply) => {
    try {
      const { userId } = request.params;

      // Find the user
      const user = await User.findByPk(userId);
      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's current etape and check role
      const userEtape = await Etape.findOne({
        include: [{
          model: User,
          where: { idUser: userId }
        }]
      });

      if (!userEtape) {
        return reply.send({
          success: true,
          message: 'No etape assigned to user',
          data: []
        });
      }

      // Check if user has a role assigned to this etape
      const userRole = await UserRoles.findOne({
        where: {
          userId: user.idUser,
          roleId: userEtape.roleId
        }
      });

      if (!userRole) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'User does not have the required role for this etape'
        });
      }

      // Rest of the existing document fetching logic
      const forwardedDocuments = await Document.findAll({
        where: {
          transferStatus: 'sent',
          '$Etape.sequenceNumber$': userEtape.sequenceNumber
        },
        include: [
          {
            model: Etape,
            as: 'etape',
            attributes: ['idEtape', 'LibelleEtape', 'sequenceNumber']
          },
          {
            model: User,
            as: 'sender',
            attributes: ['idUser', 'NomUser', 'PrenomUser']
          },
          {
            model: Commentaire,
            as: 'comments',
            attributes: ['id', 'content', 'createdAt'],
            include: [{
              model: User,
              attributes: ['idUser', 'NomUser', 'PrenomUser']
            }]
          }
        ],
        order: [
          ['transferTimestamp', 'DESC']
        ]
      });

      return reply.send({
        success: true,
        count: forwardedDocuments.length,
        data: forwardedDocuments.map(doc => ({
          idDocument: doc.idDocument,
          Title: doc.Title,
          url: doc.url,
          status: doc.status,
          transferStatus: doc.transferStatus,
          transferTimestamp: doc.transferTimestamp,
          etape: doc.etape,
          sender: doc.sender,
          comments: doc.comments,
        }))
      });

    } catch (error) {
      console.error('Error fetching forwarded documents:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  assignEtape: async (request, reply) => {
    try {
      const { documentTitle, etapeId } = request.body;

      if (!documentTitle || !etapeId) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Document title and Etape ID are required'
        });
      }

      // Find the document by title
      const document = await Document.findOne({
        where: { Title: documentTitle }
      });

      if (!document) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Document "${documentTitle}" not found`
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
        where: { Title: documentTitle },
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
  },

  updateDocument: async (request, reply) => {
    try {
      const { documentTitle } = request.params;
      const updates = request.body;

      // Find document
      const document = await Document.findOne({
        where: { Title: documentTitle }
      });

      if (!document) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Document "${documentTitle}" not found`
        });
      }

      // Update document
      await document.update(updates);

      // Fetch updated document with relations
      const updatedDocument = await Document.findOne({
        where: { Title: documentTitle },
        include: [
          { model: Commentaire, as: 'commentaires' },
          { model: File, as: 'files' },
          { model: Etape, as: 'etape' }
        ]
      });

      return reply.send({
        success: true,
        message: 'Document updated successfully',
        document: updatedDocument
      });

    } catch (error) {
      console.error('Error updating document:', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = documentController;
