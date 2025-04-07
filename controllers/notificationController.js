const { Notification } = require('../models');

const notificationController = {
  // Récupérer toutes les notifications
  async getNotifications(request, reply) {
    try {
      const userId = request.user.idUser; // Récupérer l'utilisateur connecté
      const notifications = await Notification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });

      return reply.send({
        success: true,
        data: notifications,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  },

  // Récupérer uniquement les notifications non lues
  async getUnreadNotifications(request, reply) {
    try {
      const userId = request.user.idUser;
      const notifications = await Notification.findAll({
        where: { userId, isRead: false },
        order: [['createdAt', 'DESC']],
      });

      return reply.send({
        success: true,
        data: notifications,
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications non lues:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  },

  // Marquer une notification comme lue
  async markAsRead(request, reply) {
    try {
      const { notificationId } = request.params;
      const notification = await Notification.findByPk(notificationId);

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Notification introuvable',
        });
      }

      notification.isRead = true;
      await notification.save();

      return reply.send({
        success: true,
        message: 'Notification marquée comme lue',
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la notification comme lue:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  },

  // Marquer toutes les notifications comme lues
  async markAllAsRead(request, reply) {
    try {
      const userId = request.user.idUser;
      await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      );

      return reply.send({
        success: true,
        message: 'Toutes les notifications ont été marquées comme lues',
      });
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications comme lues:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  },

  // Supprimer une notification
  async deleteNotification(request, reply) {
    try {
      const { notificationId } = request.params;
      const notification = await Notification.findByPk(notificationId);

      if (!notification) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Notification introuvable',
        });
      }

      await notification.destroy();

      return reply.send({
        success: true,
        message: 'Notification supprimée avec succès',
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  },
};

module.exports = notificationController;