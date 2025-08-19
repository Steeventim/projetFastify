const { Notification } = require("../models"); // Import du modèle Notification

/**
 * Crée une notification pour un utilisateur.
 * @param {Object} params - Les paramètres de la notification.
 * @param {string} params.userId - L'ID de l'utilisateur destinataire.
 * @param {string} params.title - Le titre de la notification.
 * @param {string} params.message - Le message de la notification.
 * @param {string} params.type - Le type de notification (ex: "document_forwarded").
 * @returns {Promise<Notification>} La notification créée.
 */

const createNotification = async ({ userId, title, message, type }) => {
  if (!userId) {
    throw new Error("userId is required to create a notification");
  }
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
    });
    // Émission socket.io ciblée si possible
    if (global._io && global._userSocketMap) {
      const socketId = global._userSocketMap.get(userId);
      if (socketId) {
        global._io.to(socketId).emit("notification", {
          userId,
          title,
          message,
          type,
          notificationId: notification.idNotification,
          createdAt: notification.createdAt,
        });
      }
    }
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

module.exports = {
  createNotification,
};
