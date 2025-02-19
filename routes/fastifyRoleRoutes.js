// Middleware
const authMiddleware = require('../middleware/authMiddleware');
// Controllers
const roleController = require('../controllers/roleController');


module.exports = async function (fastify, opts) {
  // Create Role
  fastify.post('/roles', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, roleController.createRole);

  // Update Role
  fastify.put('/roles/:roleId', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, roleController.updateRole);
  fastify.delete('/roles/:roleId', { 
    preHandler: [authMiddleware.verifyToken, authMiddleware.requireRole(['admin'])] 
  }, roleController.deleteRole);


};
