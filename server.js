require('dotenv').config();
const fastify = require('fastify')({
  logger: {
    level: 'warn', // Set the logging level to 'warn' to reduce verbosity
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true // Optional: Colorize the logs for better readability
      }
    }
  }
});
const cors = require('@fastify/cors'); // Correct package name
const fastifyReplyFrom = require('@fastify/reply-from'); // Correct package name
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
const assignPermissiontoRole = require('./routes/assignPermissiontoRole');

// CORS Configuration
fastify.register(cors, {
  origin: '*', // Allow all origins. You can specify specific origins if needed.
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
});

// Use a Fastify-compatible rate limiter
fastify.register(require('@fastify/rate-limit'), { // Correct package name
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
fastify.register(documentRoutes);


const start = async () => {
  try {
    await fastify.listen({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3003, // Changed port to 3003
      host: process.env.HOST || 'localhost'
    });
    console.log(`Server is running on port ${process.env.PORT || 3003}`); // Updated log message
  } catch (err) {
    console.error('Error starting server:', err); // Add detailed error logging
    process.exit(1);
  }
};

start();