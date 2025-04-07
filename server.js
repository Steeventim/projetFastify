require("dotenv").config();
const fastify = require("fastify")({
  logger: {
    level: "debug", // Set the logging level to 'info' to see more detailed logs
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true, // Optional: Colorize the logs for better readability
      },
    },
  },
});
<<<<<<< HEAD
const cors = require("@fastify/cors");
const initializationRoutes = require("./routes/initializationRoutes");
const replyFrom = require("@fastify/reply-from");
const db = require("./models");
const userRoutes = require("./routes/userRoutes");
const fastifyRoleRoutes = require("./routes/fastifyRoleRoutes");
const structureRoutes = require("./routes/structureRoutes");
const commentaireRoutes = require("./routes/commentaireRoutes");
const etapeRoutes = require("./routes/etapeRoutes");
const projetRoutes = require("./routes/projetRoutes");
const searchRoutes = require("./routes/searchRoutes");
const documentRoutes = require("./routes/documentRoutes");
const etapeTypeProjetRoutes = require("./routes/etapeTypeProjetRoutes");
const { Server } = require("socket.io"); // Importer socket.io

// CORS Configuration
fastify.register(cors, {
  origin: true, // This will enable all origins during development
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
=======
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

// Add health check route - must be before other route registrations
fastify.get('/health', async (request, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

// CORS Configuration
fastify.register(cors, {
  origin: true,  // More permissive for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400
>>>>>>> 117ab5ddf7171f000fdd8954d38f18f4529eeefb
});

// Add multipart support
fastify.register(require("@fastify/multipart"), {
  attachFieldsToBody: true,
  limits: {
    fieldSize: 5242880, // 5MB
    files: 10,
    fileSize: 10485760, // 10MB
  },
});

// Use a Fastify-compatible rate limiter
fastify.register(require("@fastify/rate-limit"), {
  max: 100,
  timeWindow: "15 minutes",
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

<<<<<<< HEAD
// Create a server instance for WebSocket
const server = require("http").createServer(fastify.server);
const io = new Server(server);
=======
// Add error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: 'Internal Server Error', message: error.message });
});
>>>>>>> 117ab5ddf7171f000fdd8954d38f18f4529eeefb

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User  disconnected:", socket.id);
  });

  // Example of handling a custom event
  socket.on("sendNotification", (data) => {
    console.log("Notification data received:", data);
    // Emit the notification to all connected clients
    io.emit("notification", data);
  });
});

// Start the server
const start = async () => {
  try {
    // Ensure database connection first
    await db.sequelize.authenticate();
    console.log('Database connection established');

    // Then start server
    await fastify.ready();
    await fastify.listen({
<<<<<<< HEAD
      port: process.env.PORT ? parseInt(process.env.PORT) : 3003,
      host: process.env.HOST || "localhost",
=======
      port: process.env.PORT || 3003,
      host: '0.0.0.0'
>>>>>>> 117ab5ddf7171f000fdd8954d38f18f4529eeefb
    });

    const address = fastify.server.address();
    console.log('Server listening at:', {
      port: address.port,
      host: address.address,
      protocol: 'http'
    });

  } catch (err) {
<<<<<<< HEAD
    console.error("Error starting server:", err); // Add detailed error logging
=======
    fastify.log.error('Error starting server:', err);
>>>>>>> 117ab5ddf7171f000fdd8954d38f18f4529eeefb
    process.exit(1);
  }
};

// Start the server
start();
