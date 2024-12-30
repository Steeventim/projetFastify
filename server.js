const fastify = require('fastify')();
const cors = require('fastify-cors');
const fastifyReplyFrom = require('fastify-reply-from');
const db = require('./models');
const userRoutes = require('./routes/userRoutes');
const fastifyRoleRoutes = require('./routes/fastifyRoleRoutes');
const fastifyPermissionRoutes = require('./routes/fastifyPermissionRoutes');
const structureRoutes = require('./routes/structureRoutes');
const commentaireRoutes = require('./routes/commentaireRoutes');
const etapeRoutes = require('./routes/etapeRoutes');
const projetRoutes = require('./routes/projetRoutes');
const assignPermissiontoRole = require('./routes/assignPermissiontoRole');
const searchRoutes = require('./routes/searchRoutes');

// CORS Configuration
fastify.register(cors, {
  origin: '*'
});

// Use a Fastify-compatible rate limiter
fastify.register(require('fastify-rate-limit'), {
  max: 100,
  timeWindow: '15 minutes'
});

// Register the fastify-reply-from plugin
fastify.register(fastifyReplyFrom);

// Register routes
fastify.register(userRoutes);
fastify.register(fastifyRoleRoutes);
fastify.register(fastifyPermissionRoutes);
fastify.register(structureRoutes);
fastify.register(commentaireRoutes);
fastify.register(etapeRoutes);
fastify.register(projetRoutes);
fastify.register(assignPermissiontoRole);
fastify.register(searchRoutes);

const start = async () => {
  try {
    await fastify.listen(process.env.PORT || 3002, process.env.HOST || 'localhost');
    console.log(`Server is running on port ${process.env.PORT || 3002}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();