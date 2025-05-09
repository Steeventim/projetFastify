const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const passwordResetController = require("../controllers/passwordResetController");

module.exports = async function (fastify, opts) {
  // New route to get current user information
  fastify.get(
    "/users/me",
    {
      preHandler: [authMiddleware.verifyToken],
    },
    userController.getCurrentUser
  );
  // Public Routes
  fastify.post("/users/login", userController.login);
  fastify.post("/users/register", userController.createUser);

  // Password Reset Routes
  fastify.post("/users/request-reset", passwordResetController.requestReset);
  fastify.post("/users/reset-password", passwordResetController.resetPassword);

  // Protected Routes
  fastify.get(
    "/users",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin"]),
      ],
    },
    userController.getAllUsers
  );

  fastify.get(
    "/users/:id",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin"]),
      ],
    },
    userController.getUserById
  );

  fastify.put(
    "/users/:id",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin"]),
      ],
    },
    userController.updateUser
  );

  fastify.delete(
    "/users/:id",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin"]),
      ],
    },
    userController.deleteUser
  );

  // Add refresh token route with auth middleware
  fastify.post("/refresh-token", {
    preHandler: [authMiddleware.verifyToken], // Add this line
    handler: userController.refreshToken,
  });

  fastify.post(
    "/logout",
    {
      preHandler: [authMiddleware.verifyToken], // Vérifie que l'utilisateur est authentifié
    },
    userController.logout
  );
};
