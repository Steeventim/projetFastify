require('dotenv').config();
const fastify = require('fastify')({
  logger: {
    level: 'debug', // Set the logging level to 'info' to see more detailed logs
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true // Optional: Colorize the logs for better readability
      }
    }
  }
});
const cors = require('@fastify/cors');
const initializationRoutes = require('./routes/initializationRoutes');
const replyFrom = require('@fastify/reply-from');
const db = require('./models');
const userRoutes = require('./routes/userRoutes');
const fastifyRoleRoutes = require('./routes/fastifyRoleRoutes');
const fastifyPermissionRoutes = require('./routes/fastifyPermissionRoutes');
const structureRoutes = require('./routes/structureRoutes');
const commentaireRoutes = require('./routes/commentaireRoutes');
const etapeRoutes = require('./routes/etapeRoutes');
const projetRoutes = require('./routes/projetRoutes');
const searchRoutes = require('./routes/searchRoutes');
const documentRoutes = require('./routes/documentRoutes');
const etapeTypeProjetRoutes = require('./routes/etapeTypeProjetRoutes');
const assignPermissiontoRole = require('./routes/assignPermissiontoRole');

// CORS Configuration
fastify.register(cors, {
  origin: true, // This will enable all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Use a Fastify-compatible rate limiter
fastify.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '15 minutes'
});

// Register the fastify-reply-from plugin
fastify.register(replyFrom);

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
fastify.register(etapeTypeProjetRoutes);
fastify.register(documentRoutes);
fastify.register(initializationRoutes);


const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3003,
      host: process.env.HOST || 'localhost'
    });
    console.log(`Server is running on port ${process.env.PORT || 3003}`);
  } catch (err) {
    console.error('Error starting server:', err); // Add detailed error logging
    process.exit(1);
  }
};

start();
