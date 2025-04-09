const {
  Document,
  User,
  Commentaire,
  File,
  Etape,
  UserRoles,
  Role,
  sequelize,
  Sequelize,
  Notification,
} = require("../models");
const { v4: uuidv4 } = require("uuid");
const { createNotification } = require("../utils/notificationUtils"); // Import de createNotificationconst fileHandler = require('../services/fileHandler');
const uploadConfig = require('../config/upload');

const documentController = {
  verifyDocumentStatus: async (document) => {
    try {
      const isComplete = await document.checkEtapeCompletion();
      if (isComplete) {
        document.status = "verified";
      } else {
        document.status =
          document.status === "rejected" ? "rejected" : "pending";
      }
      await document.save();
      return document;
    } catch (error) {
      throw new Error(`Error verifying document status: ${error.message}`);
    }
  },

  forwardDocument: async (request, reply) => {
    const {
      documentId,
      userId, 
      comments, 
      userId,
      comments,
      files,
      etapeId,
      UserDestinatorName: providedDestinator,
    } = request.body;
    
    const files = request.files || {};
  

    if (!documentId || !etapeId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Document ID and Etape ID are required",
      });
    }

    const transferTimestamp = new Date();
    const t = await sequelize.transaction();
  

    try {
      const etape = await Etape.findByPk(etapeId);
      if (!etape) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Etape not found",
        });
      }

      const roleCheck = await documentController.checkUserEtapeRole(userId, etapeId);
      // Role check
      const roleCheck = await documentController.checkUserEtapeRole(
        userId,
        etapeId
      );
      if (!roleCheck.success || !roleCheck.hasPermission) {
        console.log("Role check details:", roleCheck.details);
        return reply.status(403).send({
          error: "Forbidden",
          message: "User does not have the required role for this etape",
          details: roleCheck.details,
        });
      }

      const nextEtape = await Etape.findOne({
        where: {
          sequenceNumber: etape.sequenceNumber + 1,
        },
      });

      let destinatorUser;
      if (providedDestinator) {
        destinatorUser = await User.findOne({
          where: { NomUser: providedDestinator },
        });
      } else if (nextEtape) {
        const usersWithRole = await User.findAll({
          include: [
            {
              model: Role,
              through: UserRoles,
              where: { idRole: nextEtape.roleId },
            },
          ],
          limit: 1,
        });

        destinatorUser = usersWithRole[0];
      }

      if (!destinatorUser) {
        console.log('Next etape details:', {
        // Log more details about the next etape
        console.log("Next etape details:", {
          etapeId: nextEtape?.idEtape,
          etapeName: nextEtape?.LibelleEtape,
          roleId: nextEtape?.roleId,
          userCount: nextEtape?.Users?.length || 0,
        });

        return reply.status(404).send({
          error: "Destinator Not Found",
          message: "Could not determine destinator user for the next etape",
          details: {
            providedDestinator,
            nextEtapeId: nextEtape?.idEtape,
            nextEtapeName: nextEtape?.LibelleEtape,
            userCount: nextEtape?.Users?.length || 0,
          },
        });
      }

      let document = await Document.findByPk(documentId);
      if (!document) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Document not found",
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return reply.status(404).send({
          error: "Not Found",
          message: "User not found",
        });
      }


      // Remove duplicate role check here since we already checked above

      // Create only new comments from the forwarding user
      const newComments = [];
      if (comments && Array.isArray(comments)) {
        for (const comment of comments) {
          if (comment.content?.trim()) {
          if (comment.content?.trim()) {
            // Only create comment if content exists and isn't empty
            const newComment = await Commentaire.create({
              idComment: uuidv4(),
              documentId: document.idDocument,
              userId: user.idUser,
              Contenu: comment.content,
              createdAt: new Date(),
            });
            newComments.push(newComment);
          }
        }
      }

      const savedFiles = [];
      for (const fileField in files) {
        const file = files[fileField];
        try {
          const savedFile = await fileHandler.saveFile(file, document.idDocument);
          const fileRecord = await File.create({
            idFile: uuidv4(),
            documentId: document.idDocument,
            fileName: savedFile.fileName,
            originalName: savedFile.originalName,
            filePath: savedFile.filePath,
            fileType: savedFile.fileType,
            fileSize: savedFile.fileSize,
            thumbnailPath: savedFile.thumbnailPath
          }, { transaction: t });
          savedFiles.push(fileRecord);
        } catch (fileError) {
          console.error('Error processing file:', fileError);
        }
      }

      document.transferStatus = 'sent';

      // Logic to send the document to the destinator

      // Update document status
      document.transferStatus = "sent";
      document.transferTimestamp = transferTimestamp;
      document.UserDestinatorName = destinatorUser.NomUser;
      await document.save({ transaction: t });
  
      await document.save();

      // Get fresh document data including URL, comments, and files
      const updatedDocument = await Document.findByPk(documentId, {
        include: [
          {
            model: Commentaire,
            as: 'commentaires',
            required: false,
            where: newComments.length > 0 ? {
              idComment: newComments.map(c => c.idComment)
            } : undefined,
            attributes: ['idComment', 'Contenu', 'createdAt'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['idUser', 'NomUser']
            }]
            as: "commentaires",
            required: false, // Make this an outer join
            where:
              newComments.length > 0
                ? {
                    idComment: newComments.map((c) => c.idComment),
                  }
                : undefined,
            attributes: ["idComment", "Contenu", "createdAt"],
            include: [
              {
                model: User,
                as: "user",
                attributes: ["idUser", "NomUser"],
              },
            ],
          },
          {
            model: File,
            as: 'files',
            include: savedFiles.map(f => f.idFile)
          }
            as: "files",
          },
        ],
        attributes: ['idDocument', 'Title', 'status', 'transferStatus', 'transferTimestamp']
        attributes: [
          "idDocument",
          "Title",
          "url",
          "status",
          "transferStatus",
          "transferTimestamp",
        ],
      });

      await t.commit();
  
      return reply.status(200).send({ 

      return reply.status(200).send({
        success: true,
        destinatorUser: {
          id: destinatorUser.idUser,
          name: destinatorUser.NomUser,
        },
        document: updatedDocument,
        user: {
          id: user.idUser,
          name: user.NomUser,
        },
        transferStatus: "sent",
        transferTimestamp,
        comments: updatedDocument.commentaires || [],
        files: updatedDocument.files || [],
      });
    } catch (error) {
      await t.rollback();
      console.error('Error forwarding document:', {
      console.error("Error forwarding document:", {
        message: error.message,
        stack: error.stack,
        details: error.original || error,
      });
      return reply.status(500).send({
        error: "Error forwarding document",
        details: error.message,
      });
    }
  },

  forwardToNextEtape: async (request, reply) => {
    const {
      documentId,
      userId, 
      comments, 
      userId,
      comments,
      files,
      etapeId,
      UserDestinatorName,
      nextEtapeName,
    } = request.body;
    const files = request.files || {};

    const t = await sequelize.transaction();

    try {
      if (!documentId || !etapeId || !nextEtapeName) {
        return reply.status(400).send({
          error: "Bad Request",
          message:
            "Document ID, current etape ID, and next etape name are required",
        });
      }

      const currentEtape = await Etape.findByPk(etapeId, { transaction: t });
      if (!currentEtape) {
        await t.rollback();
        return reply.status(404).send({
          error: "Not Found",
          message: "Current etape not found",
        });
      }

      const nextEtape = await Etape.findOne({
        where: {
          LibelleEtape: nextEtapeName,
          sequenceNumber: { [Sequelize.Op.gt]: currentEtape.sequenceNumber }
          sequenceNumber: { [Sequelize.Op.gt]: currentEtape.sequenceNumber },
        },
        transaction: t,
      });

      const document = await Document.findByPk(documentId, { transaction: t });
      if (!document) {
        await t.rollback();
        return reply.status(404).send({
          error: "Not Found",
          message: "Document not found",
        });
      }

      if (!nextEtape) {
        await document.update({
          status: 'verified',
          transferStatus: 'received',
          transferTimestamp: new Date()
        }, { transaction: t });
        // Update document status to approved
        await document.update(
          {
            status: "verified",
            transferStatus: "received",
            transferTimestamp: new Date(),
          },
          { transaction: t }
        );

        // Log before creating notification
        console.log(
          "Creating approval notification for user:",
          document.userId
        );

        // Émettre une notification pour l'approbation
        await createNotification({
          userId: document.userId, // ID de l'utilisateur qui doit recevoir la notification
          message: `Le document ${documentId} a été approuvé.`,
          type: "document_approved",
        });

        await t.commit();
        return reply.send({
          success: true,
          message: "Document approved - final etape reached",
          document,
        });
      }

      const newComments = [];
      if (comments?.length) {
        for (const comment of comments) {
          if (comment.content?.trim()) {
            const newComment = await Commentaire.create(
              {
                idComment: uuidv4(),
                documentId: document.idDocument,
                userId,
                Contenu: comment.content,
                createdAt: new Date(),
              },
              { transaction: t }
            );
            newComments.push(newComment);
          }
        }
      }

      const savedFiles = [];
      for (const fileField in files) {
        const file = files[fileField];
        try {
          const savedFile = await fileHandler.saveFile(file, documentId);
          const fileRecord = await File.create({
            idFile: uuidv4(),
            documentId: documentId,
            fileName: savedFile.fileName,
            originalName: savedFile.originalName,
            filePath: savedFile.filePath,
            fileType: savedFile.fileType,
            fileSize: savedFile.fileSize,
            thumbnailPath: savedFile.thumbnailPath
          }, { transaction: t });
          savedFiles.push(fileRecord);
        } catch (fileError) {
          console.error('Error processing file:', fileError);
        }
      }

      await document.update({
        etapeId: nextEtape.idEtape,
        transferStatus: 'sent',
        transferTimestamp: new Date(),
        UserDestinatorName
      }, { transaction: t });
      // 7. Update document with new etape and status
      await document.update(
        {
          etapeId: nextEtape.idEtape,
          transferStatus: "sent", // Mark as sent
          transferTimestamp: new Date(),
          UserDestinatorName,
        },
        { transaction: t }
      );

      // 8. Log the state change for tracking
      console.log(
        `Document ${documentId} forwarded to etape ${nextEtape.idEtape} by user ${userId}`
      );
      // Log before creating notification
      console.log("Creating transfer notification for user:", nextEtape.userId);

      // Émettre une notification pour le transfert
      if (nextEtape.userId) {
        await createNotification({
          userId: nextEtape.userId, // ID de l'utilisateur qui doit recevoir la notification
          title: "Document Transferred",
          message: `Le document ${documentId} a été transféré à l'étape ${nextEtapeName}.`,
          type: "document_approved",
        });
      } else {
        console.warn(
          `No userId found for next etape: ${nextEtapeName} (etapeId: ${nextEtape.idEtape})`
        );
      }

      // 9. Get updated document with associations
      const updatedDocument = await Document.findOne({
        where: { idDocument: documentId },
        include: [
          {
            model: Commentaire,
            as: "commentaires",
            include: [{ model: User, as: "user" }],
          },
          { model: File, as: "files" },
          { model: Etape, as: "etape" },
        ],
        transaction: t,
      });

      await t.commit();

      // 10. Send response
      return reply.send({
        success: true,
        message: "Document forwarded to next etape successfully",
        data: {
          document: updatedDocument,
          nextEtape,
          comments: newComments,
          files: savedFiles
        }
          comments: newComments,
        },
      });
    } catch (error) {
      await t.rollback();
      console.error("Error forwarding to next etape:", error);
      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },
  viewDocument: async (request, reply) => {
    const { documentTitle } = request.params;

    try {
      const document = await Document.findOne({
        where: { Title: documentTitle },
        include: [
          { model: Commentaire, as: 'commentaires' },
          { model: File, as: 'files' },
          { model: Etape, as: 'etape' }
        ]
      }).catch(error => {
        console.error('Error fetching document:', error);
        return null;
          { model: Commentaire, as: "commentaires" },
          { model: File, as: "files" },
          { model: Etape, as: "etape" },
        ],
      }).catch((error) => {
        console.error("Error fetching document:", error);
        return null; // Return null if there's an error
      });

      if (!document) {
        return reply.status(404).send({
          error: "Not Found",
          message: `Document "${documentTitle}" not found`,
        });
      }

      if (document.transferStatus === "received") {
        document.transferStatus = "viewed";
        document.transferTimestamp = new Date();
        await document.save();
      }
      await verifyDocumentStatus(document);

      return reply.status(200).send(document);
    } catch (error) {
      console.error("Error viewing document:", error.message);
      return reply
        .status(500)
        .send({ error: "Error viewing document", details: error.message });
    }
  },

  getForwardedDocuments: async (request, reply) => {
    try {
      const { userId } = request.params;
      console.log("Looking up user with ID:", userId);

      const userRoleInfo = await UserRoles.findOne({
        where: { userId },
        include: [{
          model: Role,
          attributes: ['idRole', 'name'],
          include: [{
            model: Etape,
            as: 'etape',
            attributes: ['idEtape', 'LibelleEtape', 'sequenceNumber']
          }]
        }]
        include: [
          {
            model: Role,
            attributes: ["idRole", "name"],
            include: [
              {
                model: Etape,
                as: "etape", // Match the alias defined in your Role model
                attributes: ["idEtape", "LibelleEtape", "sequenceNumber"],
              },
            ],
          },
        ],
      });

      if (!userRoleInfo?.Role?.etape) {
        console.log("No etape found for user role");
        return reply.send({
          success: true,
          message: "No etape assigned to user",
          data: [],
        });
      }

      const userEtape = userRoleInfo.Role.etape;
      console.log("Found user etape:", userEtape.LibelleEtape);

    } catch (error) {
      console.error("Error fetching forwarded documents:", error);
      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },

  getForwardedDocumentDetails: async (request, reply) => {
    try {
      const { documentId, userId } = request.params;

      const [user, document] = await Promise.all([
        User.findOne({
          where: { idUser: userId },
          include: [
            {
              model: Role,
              as: "Roles",
            },
          ],
        }),
        Document.findOne({
          where: {
            idDocument: documentId,
            transferStatus: ["sent", "received", "viewed"],
          },
        }),
      ]);

      if (!user || !user.Roles?.length) {
        return reply.status(403).send({
          success: false,
          error: "User has no assigned roles",
        });
      }

      if (!document || document.UserDestinatorName !== user.NomUser) {
        return reply.status(404).send({
          success: false,
          error: "Document not found or not forwarded to this user",
        });
      }

      const currentRole = user.Roles[0];
      if (!currentRole?.idRole) {
        return reply.status(403).send({
          success: false,
          error: "Invalid role configuration",
        });
      }

      let currentEtape = await Etape.findOne({
        where: {
          roleId: currentRole.idRole,
        },
        attributes: ["idEtape", "LibelleEtape", "sequenceNumber"],
      });

      if (!currentEtape) {
        currentEtape = await Etape.create({
          idEtape: uuidv4(),
          LibelleEtape: `Default etape for ${currentRole.name}`,
          sequenceNumber: 1,
          roleId: currentRole.idRole,
        });
      }

      await document.update({
        etapeId: currentEtape.idEtape,
        transferStatus:
          document.transferStatus === "sent"
            ? "received"
            : document.transferStatus,
        transferTimestamp:
          document.transferStatus === "sent"
            ? new Date()
            : document.transferTimestamp,
      });

      const updatedDocument = await Document.findByPk(documentId, {
        include: [
          {
            model: Commentaire,
            as: "commentaires",
            include: [{ model: User, as: "user" }],
          },
          { model: File, as: "files" },
          { model: Etape, as: "etape" },
        ],
      });

      return reply.send({
        success: true,
        data: {
          document: {
            idDocument: updatedDocument.idDocument,
            Title: updatedDocument.Title,
            status: updatedDocument.status,
            transferStatus: updatedDocument.transferStatus,
            transferTimestamp: updatedDocument.transferTimestamp,
            url: updatedDocument.url,
            currentEtape: currentEtape,
          },
          comments: updatedDocument.commentaires || [],
          files: updatedDocument.files || [],
        },
      });
    } catch (error) {
      console.error("Error in getForwardedDocumentDetails:", error);
      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },

  assignEtape: async (request, reply) => {
    try {
      const { documentName, etapeName } = request.body;

      if (!documentName || !etapeName) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Document name and Etape name are required",
        });
      }

      const document = await Document.findOne({
        where: { Title: documentName },
      });

      if (!document) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Document "${documentName}" not found`,
        });
      }

      const etape = await Etape.findOne({
        where: { LibelleEtape: etapeName },
      });

      if (!etape) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Etape "${etapeName}" not found`,
        });
      }

      await document.update({ etapeId: etape.idEtape });
      

      // Return updated document with etape information - Fix the include alias
      const updatedDocument = await Document.findOne({
        where: { Title: documentName },
        include: [{
          model: Etape,
          as: 'etape',
          attributes: ['idEtape', 'LibelleEtape', 'Description', 'sequenceNumber']
        }]
        include: [
          {
            model: Etape,
            as: "etape", // Add the correct alias here
            attributes: [
              "idEtape",
              "LibelleEtape",
              "Description",
              "sequenceNumber",
            ],
          },
        ],
      });

      return reply.send({
        success: true,
        message: "Etape assigned successfully",
        document: updatedDocument,
      });
    } catch (error) {
      console.error("Error assigning etape:", error);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },

  updateDocument: async (request, reply) => {
    try {
      const { documentTitle } = request.params;
      const updates = request.body;

      const document = await Document.findOne({
        where: { Title: documentTitle },
      });

      if (!document) {
        return reply.code(404).send({
          error: "Not Found",
          message: `Document "${documentTitle}" not found`,
        });
      }

      await document.update(updates);

      const updatedDocument = await Document.findOne({
        where: { Title: documentTitle },
        include: [
          { model: Commentaire, as: "commentaires" },
          { model: File, as: "files" },
          { model: Etape, as: "etape" },
        ],
      });

      return reply.send({
        success: true,
        message: "Document updated successfully",
        document: updatedDocument,
      });
    } catch (error) {
      console.error("Error updating document:", error);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },

  async checkUserEtapeRole(userId, etapeId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Role,
            through: UserRoles,
            attributes: ["idRole", "name", "description"],
          },
        ],
      });

      const etape = await Etape.findByPk(etapeId);

      if (!user || !etape) {
        return {
          success: false,
          message: "User or Etape not found",
        };
      }

      const requiredRole = await Role.findByPk(etape.roleId);

      if (!requiredRole) {
        console.log("Required role not found for etape:", etape.LibelleEtape);
        return {
          success: false,
          message: "Required role not found for etape",
        };
      }

      const hasRequiredRole = user.Roles.some(role => 
        role.idRole === etape.roleId || 
        role.name.toLowerCase() === requiredRole.name.toLowerCase()
      // Check if user has the required role (case-insensitive)
      const hasRequiredRole = user.Roles.some(
        (role) =>
          role.idRole === etape.roleId ||
          role.name.toLowerCase() === requiredRole.name.toLowerCase()
      );

      console.log("Role check:", {
        userRoles: user.Roles.map((r) => ({ id: r.idRole, name: r.name })),
        requiredRoleId: etape.roleId,
        requiredRoleName: requiredRole.name,
        hasRequiredRole,
      });

      return {
        success: true,
        hasPermission: hasRequiredRole,
        details: {
          user: {
            id: user.idUser,
            name: user.NomUser,
            roles: user.Roles.map((r) => ({
              id: r.idRole,
              name: r.name,
              description: r.description,
            })),
          },
          etape: {
            id: etape.idEtape,
            name: etape.LibelleEtape,
            requiredRole: requiredRole
              ? {
                  id: requiredRole.idRole,
                  name: requiredRole.name,
                  description: requiredRole.description,
                }
              : null,
          },
        },
      };
    } catch (error) {
      console.error("Error checking role permissions:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  getReceivedDocuments: async (request, reply) => {
    const { userId } = request.params;
    const t = await sequelize.transaction();

    try {
      const user = await User.findOne({
        where: { idUser: userId },
        include: [
          {
            model: Role,
            as: "Roles",
            include: [
              {
                model: Etape,
                as: "etapes",
                attributes: ["idEtape", "LibelleEtape"],
              },
            ],
          },
        ],
        transaction: t,
      });

      console.log("Found user:", {
        id: user?.idUser,
        name: user?.NomUser,
        roles: user?.Roles?.map((r) => r.name),
        etapes: user?.Roles?.map((r) => r.etapes?.map((e) => e.LibelleEtape)),
      });

      if (!user || !user.Roles?.[0]?.etapes?.[0]) {
        await t.rollback();
        return reply.status(403).send({
          success: false,
          error: "No etape assigned to user",
        });
      }

      const currentEtape = user.Roles[0].etapes[0];

      const documents = await Document.findAll({
        where: {
          [Sequelize.Op.or]: [
          [Sequelize.Op.or]: [
            // Fix: Use Sequelize.Op instead of sequelize.Op
            { UserDestinatorName: user.NomUser },
            { etapeId: currentEtape.idEtape },
          ],
          transferStatus: ["sent", "received", "viewed"],
        },
        attributes: [
          "idDocument",
          "Title",
          "etapeId",
          "status",
          "transferStatus",
          "transferTimestamp",
          "url",
          "UserDestinatorName",
        ],
        include: [
          {
            model: Commentaire,
            as: "commentaires",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["idUser", "NomUser"],
              },
            ],
          },
          {
            model: File,
            as: "files",
          },
          {
            model: Etape,
            as: "etape",
            attributes: ["idEtape", "LibelleEtape"],
          },
        ],
        transaction: t,
      });

      console.log("Found documents:", {
        count: documents.length,
        docs: documents.map((d) => ({
          id: d.idDocument,
          title: d.Title,
          destinator: d.UserDestinatorName,
          status: d.transferStatus,
        })),
      });

      const processedDocs = await Promise.all(documents.map(async (doc) => {
        const previousEtapeId = doc.etapeId;
      // 3. Process each document
      const processedDocs = await Promise.all(
        documents.map(async (doc) => {
          const previousEtapeId = doc.etapeId;

        if (doc.UserDestinatorName === user.NomUser && previousEtapeId !== currentEtape.idEtape) {
          await doc.update({
            etapeId: currentEtape.idEtape,
            transferStatus: doc.transferStatus === 'sent' ? 'received' : doc.transferStatus
          }, { transaction: t });
        }
          // Only update if document is sent to this user specifically
          if (
            doc.UserDestinatorName === user.NomUser &&
            previousEtapeId !== currentEtape.idEtape
          ) {
            await doc.update(
              {
                etapeId: currentEtape.idEtape,
                transferStatus:
                  doc.transferStatus === "sent"
                    ? "received"
                    : doc.transferStatus,
              },
              { transaction: t }
            );
          }

          return {
            documentId: doc.idDocument,
            title: doc.Title,
            previousEtapeId,
            currentEtapeId: currentEtape.idEtape,
            senderUserId: doc.commentaires[0]?.userId,
            status: doc.status,
            transferStatus: doc.transferStatus,
            transferTimestamp: doc.transferTimestamp,
            url: doc.url,
            destinator: doc.UserDestinatorName,
            comments:
              doc.commentaires?.map((c) => ({
                id: c.idComment,
                content: c.Contenu,
                createdAt: c.createdAt,
                user: c.user
                  ? {
                      id: c.user.idUser,
                      name: c.user.NomUser,
                    }
                  : null,
              })) || [],
            files: doc.files || [],
          };
        })
      );

      await t.commit();

      return reply.send({
        success: true,
        count: processedDocs.length,
        data: processedDocs,
      });
    } catch (error) {
      await t.rollback();
      console.error("Error fetching received documents:", error);
      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },

  approveDocument: async (request, reply) => {
    const { documentId, userId, etapeId, comments, files } = request.body;

    const t = await sequelize.transaction();

    try {
      if (!documentId || !userId || !etapeId) {
        return reply.status(400).send({
          error: "Bad Request",
          message: "Document ID, User ID, and Etape ID are required",
        });
      }

      const document = await Document.findByPk(documentId, { transaction: t });
      if (!document) {
        await t.rollback();
        return reply.status(404).send({
          error: "Not Found",
          message: "Document not found",
        });
      }

      const newComments = [];
      if (comments?.length) {
        for (const comment of comments) {
          if (comment.content?.trim()) {
            const newComment = await Commentaire.create(
              {
                idComment: uuidv4(),
                documentId: document.idDocument,
                userId,
                Contenu: comment.content,
                createdAt: new Date(),
              },
              { transaction: t }
            );
            newComments.push(newComment);
          }
        }
      }

      await document.update({
        status: 'verified',
        transferStatus: 'received',
        transferTimestamp: new Date()
      }, { transaction: t });
      // 4. Update document status
      await document.update(
        {
          status: "verified",
          transferStatus: "received",
          transferTimestamp: new Date(),
        },
        { transaction: t }
      );

      const updatedDocument = await Document.findOne({
        where: { idDocument: documentId },
        include: [
          {
            model: Commentaire,
            as: "commentaires",
            include: [{ model: User, as: "user" }],
          },
          { model: File, as: "files" },
          { model: Etape, as: "etape" },
        ],
        transaction: t,
      });

      await t.commit();

      return reply.send({
        success: true,
        message: "Document approved successfully",
        data: {
          document: updatedDocument,
          comments: newComments,
        },
      });
    } catch (error) {
      await t.rollback();
      console.error("Error approving document:", error);
      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },

  getLatestDocument: async (request, reply) => {
    try {
      const latestDocument = await Document.findOne({
        include: [
          {
            model: Commentaire,
            as: "commentaires",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["idUser", "NomUser"],
              },
            ],
          },
          {
            model: File,
            as: "files",
          },
          {
            model: Etape,
            as: "etape",
            attributes: [
              "idEtape",
              "LibelleEtape",
              "Description",
              "sequenceNumber",
            ],
          },
        ],
        order: [
          ['createdAt', 'DESC']
          ["createdAt", "DESC"], // Order by creation date, most recent first
        ],
        attributes: [
          "idDocument",
          "Title",
          "status",
          "transferStatus",
          "transferTimestamp",
          "url",
          "createdAt",
          "updatedAt",
        ],
      });

      if (!latestDocument) {
        return reply.status(404).send({
          success: false,
          error: "Not Found",
          message: "No documents found in the database",
        });
      }

      const formattedDocument = {
        ...latestDocument.get({ plain: true }),
        commentaires:
          latestDocument.commentaires?.map((comment) => ({
            idComment: comment.idComment,
            Contenu: comment.Contenu,
            createdAt: comment.createdAt,
            user: {
              idUser: comment.user?.idUser,
              NomUser: comment.user?.NomUser,
            },
          })) || [],
        files:
          latestDocument.files?.map((file) => ({
            idFile: file.idFile,
            name: file.name,
            url: file.url,
          })) || [],
        etape: latestDocument.etape
          ? {
              idEtape: latestDocument.etape.idEtape,
              LibelleEtape: latestDocument.etape.LibelleEtape,
              Description: latestDocument.etape.Description,
              sequenceNumber: latestDocument.etape.sequenceNumber,
            }
          : null,
      };

      return reply.send({
        success: true,
        data: formattedDocument,
      });
    } catch (error) {
      console.error("Error fetching latest document:", error);
      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },

  rejectDocument: async (request, reply) => {
    const t = await sequelize.transaction();
    try {
      const { documentId, userId, comments } = request.body;

      if (!documentId || !userId) {
        await t.rollback();
        return reply.status(400).send({
          success: false,
          message: "Document ID and User ID are required",
        });
      }

      const document = await Document.findOne({
        where: { idDocument: documentId },
        include: [
          {
            model: Commentaire,
            as: "commentaires",
            include: [{ model: User, as: "user" }],
            order: [["createdAt", "ASC"]],
          },
          { model: File, as: "files" },
          { model: Etape, as: "etape" },
        ],
        transaction: t,
      });

      if (!document) {
        await t.rollback();
        return reply.status(404).send({
          success: false,
          message: "Document not found",
        });
      }

      const firstComment = document.commentaires[0];
      if (!firstComment?.user) {
        await t.rollback();
        return reply.status(404).send({
          success: false,
          message: "Cannot determine original sender",
        });
      }

      const originalSender = firstComment.user;

      const newComments = [];
      if (comments?.length) {
        for (const comment of comments) {
          if (comment.content?.trim()) {
            const newComment = await Commentaire.create(
              {
                idComment: uuidv4(),
                documentId: document.idDocument,
                userId,
                Contenu: comment.content,
                createdAt: new Date(),
              },
              { transaction: t }
            );
            newComments.push(newComment);
          }
        }
      }

      await document.update({
        status: 'rejected',
        transferStatus: 'sent',
        transferTimestamp: new Date(),
        UserDestinatorName: originalSender.NomUser
      }, { transaction: t });
      // 5. Update document status
      await document.update(
        {
          status: "rejected",
          transferStatus: "sent",
          transferTimestamp: new Date(),
          UserDestinatorName: originalSender.NomUser,
        },
        { transaction: t }
      );

      const updatedDocument = await Document.findOne({
        where: { idDocument: documentId },
        include: [
          {
            model: Commentaire,
            as: "commentaires",
            include: [{ model: User, as: "user" }],
          },
          { model: File, as: "files" },
          { model: Etape, as: "etape" },
        ],
        transaction: t,
      });

      await t.commit();

      return reply.send({
        success: true,
        message: "Document rejected and returned to sender",
        data: {
          document: updatedDocument,
          returnedTo: {
            id: originalSender.idUser,
            name: originalSender.NomUser,
          },
          comments: newComments,
          files: document.files,
        },
      });
    } catch (error) {
      await t.rollback();
      console.error("Error rejecting document:", error);
      return reply.status(500).send({
        success: false,
        error: "Internal Server Error",
        message: error.message,
      });
    }
  },
};

module.exports = documentController;
