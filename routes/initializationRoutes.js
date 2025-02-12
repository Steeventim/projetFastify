const initializationController = require('../controllers/initializationController');
const authMiddleware = require('../middleware/authMiddleware');

module.exports = async function(fastify, opts) {
  fastify.post('/init/admin', {
    preHandler: [authMiddleware.verifyToken]
  }, initializationController.createAdmin);
};