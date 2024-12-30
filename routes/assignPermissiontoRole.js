const fastify = require('fastify')();
const rolePermissionController = require('../controllers/rolePermissionController');
const authMiddleware = require('../middlewares/authMiddleware');

// Define a route to assign permission to a role with authentication and admin role check
fastify.post('/assign-permission', { preHandler: authMiddleware.requireRole(['admin']) }, rolePermissionController.assignPermissionToRole);

module.exports = fastify;
