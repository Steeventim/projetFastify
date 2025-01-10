require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors'); // Updated package
const fastifyReplyFrom = require('@fastify/reply-from'); // Updated package
const db = require('./models');
const userRoutes = require('./routes/userRoutes');
const fastifyRoleRoutes = require('./routes/fastifyRoleRoutes');
const fastifyPermissionRoutes = require('./routes/fastifyPermissionRoutes');
const structureRoutes = require('./routes/structureRoutes');
const commentaireRoutes = require('./routes/commentaireRoutes');
const etapeRoutes = require('./routes/etapeRoutes');
const projetRoutes = require('./routes/projetRoutes');
const searchRoutes = require('./routes/searchRoutes');
const assignPermissiontoRole = require('./routes/assignPermissiontoRole');
const documentRoutes = require('./routes/documentRoutes'); // Ensure this line is added

// CORS Configuration
fastify.register(cors, {
  origin: '*'
});

// Use a Fastify-compatible rate limiter
fastify.register(require('@fastify/rate-limit'), { // Updated package
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
fastify.register(documentRoutes); // Ensure this line is added

const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3002,
      host: process.env.HOST || 'localhost'
    });
    console.log(`Server is running on port ${process.env.PORT || 3002}`);
  } catch (err) {
    console.error('Error starting server:', err); // Add detailed error logging
    process.exit(1);
  }
};

start();