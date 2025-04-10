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
const structureRoutes = require('./routes/structureRoutes');
const commentaireRoutes = require('./routes/commentaireRoutes');
const etapeRoutes = require('./routes/etapeRoutes');
const projetRoutes = require('./routes/projetRoutes');
const searchRoutes = require('./routes/searchRoutes');
const documentRoutes = require('./routes/documentRoutes');
const etapeTypeProjetRoutes = require('./routes/etapeTypeProjetRoutes');


// CORS Configuration
fastify.register(cors, {
  origin: true, // This will enable all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Add multipart support
fastify.register(require('@fastify/multipart'), {
  attachFieldsToBody: true,
  limits: {
    fieldSize: 5242880, // 5MB
    files: 10,
    fileSize: 10485760 // 10MB
  }
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
fastify.register(etapeRoutes);
fastify.register(searchRoutes);
fastify.register(projetRoutes);
fastify.register(structureRoutes);
fastify.register(commentaireRoutes);
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
    // Ensure database connection first
    await db.sequelize.authenticate();
    console.log("Database connection established");

    // Then start server
    await fastify.ready();
    await fastify.listen({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3003,
      host: process.env.HOST || "localhost",
    });

    const address = fastify.server.address();
    if (address && typeof address !== "string") {
      console.log("Server listening at:", {
        port: address.port,
        host: address.address,
        protocol: "http",
      });
    } else if (typeof address === "string") {
      console.log("Server listening at:", address);
    } else {
      console.error(
        "Failed to retrieve server address. The server might not be listening."
      );
    }
  } catch (err) {
    console.error("Error starting server:", err); // Add detailed error logging
    process.exit(1);
  }
};

start();
