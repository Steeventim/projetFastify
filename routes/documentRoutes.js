const documentController = require("../controllers/documentController");
const authMiddleware = require("../middleware/authMiddleware");
module.exports = async function (fastify, opts) {
  fastify.post(
    "/forward-document",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
    },
    documentController.forwardDocument
  );

  fastify.get(
    "/document/:documentName",
    {
      preHandler: [authMiddleware.verifyToken],
      schema: {
        params: {
          type: "object",
          required: ["documentName"],
          properties: {
            documentName: { type: "string" },
          },
        },
      },
    },
    documentController.viewDocument
  );

  // Route to assign etape to document
  fastify.post(
    "/assign-etape",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "supervisor"]),
      ],
      schema: {
        body: {
          type: "object",
          required: ["documentName", "etapeName"],
          properties: {
            documentName: { type: "string" },
            etapeName: { type: "string" },
          },
        },
      },
    },
    documentController.assignEtape
  );

  fastify.get(
    "/forwarded-documents-get/:userId",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
      schema: {
        params: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    documentController.getForwardedDocuments
  );

  // Add new route to get forwarded document details
  fastify.get(
    "/forwarded-document/:documentId/:userId",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
      schema: {
        params: {
          type: "object",
          required: ["documentId", "userId"],
          properties: {
            documentId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
          },
        },
      },
    },
    documentController.getForwardedDocumentDetails
  );

  // Add new route for forwarding to next etape
  fastify.post(
    "/forward-to-next-etape",
    {
      schema: {
        consumes: ["multipart/form-data"],
        body: {
          type: "object",
          required: [
            "documentId",
            "userId",
            "etapeId",
            "nextEtapeName",
            "UserDestinatorName",
          ],
          properties: {
            documentId: {
              type: "string",
              format: "uuid",
              description: "Unique identifier of the document",
            },
            userId: {
              type: "string",
              format: "uuid",
              description:
                "Unique identifier of the user performing the action",
            },
            etapeId: {
              type: "string",
              format: "uuid",
              description: "Current etape ID of the document",
            },
            nextEtapeName: {
              type: "string",
              description: "Name of the next etape",
            },
            UserDestinatorName: {
              type: "string",
              description:
                "Name of the user to whom the document is being forwarded",
            },
            comments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: {
                    type: "string",
                    description: "Content of the comment",
                  },
                },
              },
              description: "Array of comments to be added to the document",
            },
            files: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  filename: {
                    type: "string",
                    description: "Name of the file",
                  },
                  mimetype: {
                    type: "string",
                    description: "MIME type of the file",
                  },
                  encoding: {
                    type: "string",
                    description: "Encoding of the file",
                  },
                },
              },
              description: "Array of files to be attached to the document",
            },
          },
          additionalProperties: false, // Disallow additional properties for stricter validation
        },
      },
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
    },
    documentController.forwardToNextEtape
  );

  // Add new route for approving document
  fastify.post(
    "/approve-document",
    {
      schema: {
        consumes: ["multipart/form-data"],
        body: {
          type: "object",
          required: ["documentId", "userId", "etapeId"],
          properties: {
            documentId: {
              type: "string",
              format: "uuid",
            },
            userId: {
              type: "string",
              format: "uuid",
            },
            etapeId: {
              type: "string",
              format: "uuid",
            },
            "comments.*.content": { type: "string" },
            "files.*": {
              type: "object",
              properties: {
                filename: { type: "string" },
                mimetype: { type: "string" },
                encoding: { type: "string" },
              },
            },
          },
          additionalProperties: true,
        },
      },
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
    },
    documentController.approveDocument
  );

  // Add new route for received documents
  fastify.get(
    "/received-documents/:userId",
    {
      schema: {
        params: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string", format: "uuid" },
          },
        },
      },
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
    },
    documentController.getReceivedDocuments
  );

  // Add this route definition
  fastify.get(
    "/latest-document",
    {
      preHandler: [
        authMiddleware.verifyToken,
        authMiddleware.requireRole(["admin", "user"]),
      ],
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: {
                type: "object",
                properties: {
                  idDocument: { type: "string" },
                  Title: { type: "string" },
                  status: { type: "string" },
                  transferStatus: { type: "string" },
                  transferTimestamp: { type: "string" },
                  url: { type: "string" },
                  createdAt: { type: "string" },
                  updatedAt: { type: "string" },
                  etape: {
                    type: "object",
                    properties: {
                      idEtape: { type: "string" },
                      LibelleEtape: { type: "string" },
                    },
                  },
                  commentaires: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        idComment: { type: "string" },
                        Contenu: { type: "string" },
                        createdAt: { type: "string" },
                      },
                    },
                  },
                  files: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        idFile: { type: "string" },
                        name: { type: "string" },
                        url: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    documentController.getLatestDocument
  );

  // Add reject document route
  fastify.post(
    "/documents/:documentId/reject",
    {
      schema: {
        body: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string", format: "uuid" },
            comments: {
              type: "array",
              items: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", minLength: 1 },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  document: { type: "object" },
                  returnedTo: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                  comments: { type: "array" },
                  files: { type: "array" },
                },
              },
            },
          },
        },
      },
      preHandler: [authMiddleware.verifyToken],
    },
    documentController.rejectDocument
  );
};
