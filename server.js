"use strict";
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

const cors = require("@fastify/cors");
const replyFrom = require("@fastify/reply-from");
const db = require("./models");
const { Notification } = require("./models");

// Import routes
const initializationRoutes = require("./routes/initializationRoutes");
const userRoutes = require("./routes/userRoutes");
const fastifyRoleRoutes = require("./routes/fastifyRoleRoutes");
const structureRoutes = require("./routes/structureRoutes");
const commentaireRoutes = require("./routes/commentaireRoutes");
const etapeRoutes = require("./routes/etapeRoutes");
const projetRoutes = require("./routes/projetRoutes");
const searchRoutes = require("./routes/searchRoutes");
const documentRoutes = require("./routes/documentRoutes");
const etapeTypeProjetRoutes = require("./routes/etapeTypeProjetRoutes");
const notificationRoutes = require("./routes/notificatonRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// Register plugins in correct order
fastify.register(cors, {
  origin: true, // This will enable all origins during development
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  credentials: true,
  maxAge: 86400,
});

// Register static files plugin - temporairement désactivé
// fastify.register(require('@fastify/static'), {
//   root: require('path').join(__dirname, 'public'),
//   prefix: '/public/'
// });

// Register view engine for serving HTML files - temporairement désactivé
// fastify.register(require('@fastify/view'), {
//   engine: {
//     handlebars: require('handlebars')
//   },
//   root: require('path').join(__dirname, 'views')
// });

// Register reply-from before multipart
fastify.register(replyFrom);

// Add rate limiter
fastify.register(require("@fastify/rate-limit"), {
  max: 100,
  timeWindow: "15 minutes",
});

// Add multipart support after reply-from
fastify.register(require("@fastify/multipart"), {
  attachFieldsToBody: true,
  limits: {
    fieldSize: 10485760, // 10MB
    files: 10,
    fileSize: 52428800, // 50MB
  },
});

// Add health check route - must be before other route registrations
fastify.get("/health", async (request, reply) => {
  return reply.send({ status: "ok", timestamp: new Date().toISOString() });
});

// Add favicon route to prevent 404 errors
fastify.get("/favicon.ico", async (request, reply) => {
  return reply.status(204).send();
});

// Add detailed health check route
fastify.get("/health/detailed", async (request, reply) => {
  try {
    const HealthChecker = require('./utils/healthChecker');
    const healthChecker = new HealthChecker();
    
    // Ajouter les checks
    healthChecker.addCheck('database', HealthChecker.checkDatabase);
    healthChecker.addCheck('filesystem', HealthChecker.checkFileSystem);
    healthChecker.addCheck('memory', HealthChecker.checkMemory);
    healthChecker.addCheck('environment', HealthChecker.checkEnvironment);
    healthChecker.addCheck('elasticsearch', HealthChecker.checkElasticsearch);
    
    const report = await healthChecker.runAllChecks();
    
    const statusCode = report.status === 'healthy' ? 200 : 503;
    return reply.status(statusCode).send(report);
  } catch (error) {
    return reply.status(500).send({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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
fastify.register(notificationRoutes);
fastify.register(dashboardRoutes);

// Create a server instance for WebSocket
const server = require("http").createServer(fastify.server);
const { Server } = require("socket.io"); // Importer socket.io
const io = new Server(server);

// Add error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply
    .status(500)
    .send({ error: "Internal Server Error", message: error.message });
});

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
    console.log("Database connection established");

    // Then start server
    await fastify.ready();
    await fastify.listen({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3003,
      host: process.env.HOST || "0.0.0.0", // Use 0.0.0.0 to allow external access
    });

    const address = fastify.server.address();
    console.log("Server listening at:", {
      port: address.port,
      host: address.address,
      protocol: "http",
    });
    console.log(Notification); // Vérifiez que le modèle est défini
  } catch (err) {
    console.error("Error starting server:", err); // Add detailed error logging
    fastify.log.error("Error starting server:", err);
    process.exit(1);
  }
};

// Start the server
start();
