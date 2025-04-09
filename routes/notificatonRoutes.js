const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

module.exports = async function (fastify, opts) {
  // Récupérer toutes les notifications
  fastify.get(
    "/notifications",
    {
      preHandler: [authMiddleware.verifyToken],
    },
    notificationController.getNotifications
  );

  // Récupérer uniquement les notifications non lues
  fastify.get(
    "/notifications/unread",
    {
      preHandler: [authMiddleware.verifyToken],
    },
    notificationController.getUnreadNotifications
  );

  // Marquer une notification comme lue
  fastify.put(
    "/notifications/:notificationId/read",
    {
      preHandler: [authMiddleware.verifyToken],
    },
    notificationController.markAsRead
  );

  // Marquer toutes les notifications comme lues
  fastify.put(
    "/notifications/read-all",
    {
      preHandler: [authMiddleware.verifyToken],
    },
    notificationController.markAllAsRead
  );

  // Supprimer une notification
  fastify.delete(
    "/notifications/:notificationId",
    {
      preHandler: [authMiddleware.verifyToken],
    },
    notificationController.deleteNotification
  );
};
