const { Document, DocumentTransfer, User } = require('../models');
const { Op } = require('sequelize');
const websocketService = require('../services/websocketService');

const documentTransferController = {
  async sendDocument(request, reply) {
    try {
      const { documentId, recipientId, message } = request.body;
      const senderId = request.user.idUser; // from auth token

      // Create transfer record
      const transfer = await DocumentTransfer.create({
        documentId,
        senderId,
        recipientId,
        message,
        status: 'sent',
        deliveredAt: new Date()
      });

      // Notify recipient via WebSocket
      websocketService.notifyUser(recipientId, {
        type: 'NEW_DOCUMENT',
        data: {
          transferId: transfer.id,
          senderId,
          documentId,
          message
        }
      });

      return reply.send({
        statusCode: 200,
        message: 'Document sent successfully',
        transfer
      });
    } catch (error) {
      console.error('Send document error:', error);
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  async getReceivedDocuments(request, reply) {
    try {
      const userId = request.user.idUser;
      
      const transfers = await DocumentTransfer.findAll({
        where: {
          recipientId: userId
        },
        include: [
          {
            model: Document,
            as: 'document',
            attributes: ['idDocument', 'Title', 'content']
          },
          {
            model: User,
            as: 'sender',
            attributes: ['idUser', 'NomUser', 'Email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return reply.send(transfers);
    } catch (error) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  async markAsViewed(request, reply) {
    try {
      const { transferId } = request.params;
      const userId = request.user.idUser;

      const transfer = await DocumentTransfer.findOne({
        where: {
          id: transferId,
          recipientId: userId
        }
      });

      if (!transfer) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Transfer not found'
        });
      }

      await transfer.update({
        status: 'viewed',
        viewedAt: new Date()
      });

      // Notify sender that document was viewed
      websocketService.notifyUser(transfer.senderId, {
        type: 'DOCUMENT_VIEWED',
        data: {
          transferId,
          viewedAt: transfer.viewedAt
        }
      });

      return reply.send({
        statusCode: 200,
        message: 'Document marked as viewed',
        transfer
      });
    } catch (error) {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = documentTransferController;
