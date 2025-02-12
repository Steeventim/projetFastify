const rolePermissionController = require('../controllers/rolePermissionController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function (fastify, opts) {
  // Assign permission to a role
  fastify.post('/assign-permission', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, rolePermissionController.assignPermissionToRole);
};