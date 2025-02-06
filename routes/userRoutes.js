const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Public Routes
  fastify.post('/users/login', userController.login);
  fastify.post('/users/register', userController.createUser);

  // Protected Routes
  fastify.get('/users', { 
    preHandler: [authMiddleware.requireRole(['admin'])] 
  }, userController.getAllUsers);

  fastify.get('/users/:id', { 
    preHandler: [authMiddleware.verifyToken] 
  }, userController.getUserById);

  fastify.put('/users/:id', { 
    preHandler: [authMiddleware.verifyToken] 
  }, userController.updateUser);

  fastify.delete('/users/:id', { 
    preHandler: [authMiddleware.requireRole(['admin'])] 
  }, userController.deleteUser);

  // Logout Route
  fastify.post('/users/logout', { 
    preHandler: [authMiddleware.verifyToken] 
  }, userController.logout);
};
