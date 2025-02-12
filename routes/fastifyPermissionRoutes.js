// Middleware
const authMiddleware = require('../middleware/authMiddleware');
// Controllers
const permissionController = require('../controllers/permissionController');

module.exports = async function (fastify, opts) {
  // Create Permission
  fastify.post('/permissions', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, permissionController.createPermission);
  fastify.put('/permissions/:permissionId', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, permissionController.updatePermission);
  fastify.delete('/permissions/:permissionId', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, permissionController.deletePermission);
};
