const { Etape, TypeProjet, Document, User, Role, sequelize, Sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

const { EtapeTypeProjet } = require('../models'); // Import the EtapeTypeProjet model

const etapeController = {
  affectEtapeToDocument: async (request, reply) => {
    try {
      const { etapeName, documentId, typeProjetLibelle } = request.body;

      // Find the etape and document by ID
      const etape = await Etape.findOne({ where: { LibelleEtape: etapeName } });
      const document = await Document.findByPk(documentId);

      if (!etape || !document) {
        return reply.code(404).send({
          success: false,
          message: 'Etape or Document not found'
        });
      }

      // Update the document to associate it with the etape
      document.etapeId = etape.idEtape; // Use correct property name
      await document.save();

      // Get updated document with etape information
      const updatedDocument = await Document.findByPk(documentId, {
        include: [{
          model: Etape,
          as: 'etape',
          attributes: ['idEtape', 'LibelleEtape', 'Description']
        }]
      });

      return reply.send({
        success: true,
        message: 'Etape associated with Document successfully',
        data: updatedDocument
      });
    } catch (error) {
      console.error('Error affecting etape to document:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  getAllEtapes: async (request, reply) => {
    try {
      const etapes = await Etape.findAll({
        attributes: [
          'idEtape',
          'LibelleEtape',
          'Description',
          'Validation',
          'sequenceNumber',
          'createdAt',
          'updatedAt'
        ],
        include: [
          {
            model: Document,
            as: 'documents',
            attributes: ['idDocument', 'Title']
          },
          {
            model: TypeProjet,
            as: 'typeProjets',
            through: 'EtapeTypeProjet',
            attributes: ['idType', 'Libelle', 'Description']
          }
        ],
        order: [['sequenceNumber', 'ASC']]
      });

      console.log('Retrieved etapes:', etapes.map(etape => etape.get({ plain: true })));

      // Transform the data to plain objects and ensure all properties are included
      const formattedEtapes = etapes.map(etape => {
        const plainEtape = etape.get({ plain: true });
        return {
          idEtape: plainEtape.idEtape,
          LibelleEtape: plainEtape.LibelleEtape,
          Description: plainEtape.Description,
          Validation: plainEtape.Validation,
          sequenceNumber: plainEtape.sequenceNumber,
          createdAt: plainEtape.createdAt,
          updatedAt: plainEtape.updatedAt,
          documents: plainEtape.documents ? plainEtape.documents.map(doc => ({
            idDocument: doc.idDocument,
            Title: doc.Title
          })) : [],
          typeProjets: plainEtape.typeProjets ? plainEtape.typeProjets.map(tp => ({
            idType: tp.idType,
            Libelle: tp.Libelle,
            Description: tp.Description
          })) : []
        };
      });

      console.log('Formatted etapes:', formattedEtapes);

      // Get total count of all etapes (add this before the return)
      const totalEtapesCount = await Etape.count();

      return reply.send({
        success: true,
        count: formattedEtapes.length,
        totalEtapes: totalEtapesCount,
        data: formattedEtapes
      });

    } catch (error) {
      console.error('Error fetching etapes:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  getEtapesByTypeProjet: async (request, reply) => {
    try {
      const { typeProjetId } = request.params;

      // Validate typeProjetId
      const typeProjet = await TypeProjet.findByPk(typeProjetId);
      if (!typeProjet) {
        return reply.code(404).send({
          success: false,
          error: 'TypeProjet not found'
        });
      }

      // Get all etapes for this typeProjet
      const etapes = await Etape.findAll({
        include: [{
          model: TypeProjet,
          as: 'typeProjets',
          where: { idType: typeProjetId },
          attributes: ['idType', 'Libelle', 'Description']
        }],
        order: [['sequenceNumber', 'ASC']],
        attributes: [
          'idEtape',
          'LibelleEtape',
          'Description',
          'Validation',
          'sequenceNumber',
          'createdAt',
          'updatedAt'
        ]
      });

      return reply.send({
        success: true,
        typeProjet: {
          id: typeProjet.idType,
          libelle: typeProjet.Libelle,
          description: typeProjet.Description
        },
        count: etapes.length,
        data: etapes
      });

    } catch (error) {
      console.error('Error fetching etapes by type projet:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  getEtapeById: async (request, reply) => {
    try {
      const { etapeId } = request.params;

      // Get current etape with its associations
      const etape = await Etape.findOne({
        where: { idEtape: etapeId },
        attributes: [
          'idEtape',
          'LibelleEtape',
          'Description',
          'Validation',
          'sequenceNumber',
          'createdAt',
          'updatedAt'
        ],
        include: [
          {
            model: Document,
            as: 'documents',
            attributes: ['idDocument', 'Title']
          },
          {
            model: TypeProjet,
            as: 'typeProjets',
            through: 'EtapeTypeProjet',
            attributes: ['idType', 'Libelle', 'Description']
          }
        ]
      });

      if (!etape) {
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Etape not found'
        });
      }

      // Find the next etape based on sequence number and type projet
      const nextEtape = await Etape.findOne({
        include: [{
          model: TypeProjet,
          as: 'typeProjets',
          where: {
            idType: {
              [Sequelize.Op.in]: etape.typeProjets.map(tp => tp.idType)  // Fix: Use Sequelize.Op instead of sequelize.Op
            }
          }
        }],
        where: {
          sequenceNumber: etape.sequenceNumber + 1
        },
        attributes: ['idEtape', 'LibelleEtape']
      });

      return reply.send({
        success: true,
        data: etape,
        nextEtape: nextEtape ? {
          idEtape: nextEtape.idEtape,
          LibelleEtape: nextEtape.LibelleEtape
        } : null
      });

    } catch (error) {
      console.error('Error fetching etape:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  getUsersOfNextEtape: async (request, reply) => {
    try {
      const { etapeId } = request.params;

      // Debug log
      console.log('Getting users for next etape after:', etapeId);

      // 1. Get current etape with type projets
      const currentEtape = await Etape.findOne({
        where: { idEtape: etapeId },
        include: [{
          model: TypeProjet,
          as: 'typeProjets',
          attributes: ['idType', 'Libelle']
        }]
      });

      if (!currentEtape) {
        console.log('Current etape not found:', etapeId);
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Current etape not found'
        });
      }

      console.log('Current etape sequence:', currentEtape.sequenceNumber);
      console.log('Type projets:', currentEtape.typeProjets.map(tp => tp.idType));

      // 2. Find next etape
      const nextEtape = await Etape.findOne({
        where: {
          sequenceNumber: currentEtape.sequenceNumber + 1
        },
        include: [{
          model: TypeProjet,
          as: 'typeProjets',
          where: {
            idType: {
              [Sequelize.Op.in]: currentEtape.typeProjets.map(tp => tp.idType)
            }
          }
        }]
      });

      if (!nextEtape) {
        console.log('No next etape found after sequence:', currentEtape.sequenceNumber);
        return reply.send({
          success: true,
          message: 'No next etape found - this is the final etape',
          data: {
            currentEtape: {
              id: currentEtape.idEtape,
              name: currentEtape.LibelleEtape,
              sequence: currentEtape.sequenceNumber
            }
          }
        });
      }

      console.log('Next etape found:', nextEtape.idEtape);

      // 3. Get users with matching role
      if (!nextEtape.roleId) {
        return reply.send({
          success: true,
          message: 'Next etape has no role assigned',
          data: {
            nextEtape: {
              id: nextEtape.idEtape,
              name: nextEtape.LibelleEtape,
              sequence: nextEtape.sequenceNumber
            },
            users: []
          }
        });
      }

      const usersWithRole = await User.findAll({
        attributes: ['idUser', 'NomUser', 'Email'],
        include: [{
          model: Role,
          attributes: ['idRole', 'name'],
          where: { idRole: nextEtape.roleId }
        }],
        order: [['NomUser', 'ASC']]
      });

      return reply.send({
        success: true,
        data: {
          currentEtape: {
            id: currentEtape.idEtape,
            name: currentEtape.LibelleEtape,
            sequence: currentEtape.sequenceNumber
          },
          nextEtape: {
            id: nextEtape.idEtape,
            name: nextEtape.LibelleEtape,
            sequence: nextEtape.sequenceNumber,
            roleId: nextEtape.roleId,
            userCount: usersWithRole.length,
            users: usersWithRole.map(user => ({
              id: user.idUser,
              name: user.NomUser,
              email: user.Email
            }))
          }
        }
      });

    } catch (error) {
      console.error('Error getting users of next etape:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  },

  createEtape: async (request, reply) => {
    const t = await sequelize.transaction();

    try {
      // Ensure we're working with an array
      const etapes = Array.isArray(request.body) ? request.body : [request.body];
      console.log('Number of etapes to create:', etapes.length);

      if (etapes.length === 0) {
        await t.rollback();
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'At least one etape is required'
        });
      }

      const createdEtapes = [];

      // Process each etape
      for (const etape of etapes) {
        if (!etape.LibelleEtape?.trim() || !etape.typeProjetLibelle) {
          await t.rollback();
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Each etape must have a LibelleEtape and typeProjetLibelle'
          });
        }

        // Find or create TypeProjet
        const [typeProjet] = await TypeProjet.findOrCreate({
          where: { Libelle: etape.typeProjetLibelle },
          defaults: {
            idType: uuidv4(),
            Description: `Type de projet: ${etape.typeProjetLibelle}`
          },
          transaction: t
        });

        // Get max sequence number for this typeProjet
        const maxSeqEtape = await Etape.findOne({
          include: [{
            model: TypeProjet,
            as: 'typeProjets',
            where: { idType: typeProjet.idType }
          }],
          order: [['sequenceNumber', 'DESC']],
          transaction: t
        });

        const nextSequence = maxSeqEtape ? maxSeqEtape.sequenceNumber + 1 : 1;
        console.log(`Next sequence for typeProjet ${typeProjet.Libelle}:`, nextSequence);

        // Create etape with calculated sequence number
        const newEtape = await Etape.create({
          idEtape: uuidv4(),
          LibelleEtape: etape.LibelleEtape,
          Description: etape.Description,
          Validation: etape.Validation,
          sequenceNumber: nextSequence,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { transaction: t });

        // Associate with TypeProjet
        await newEtape.addTypeProjet(typeProjet, { transaction: t });
        newEtape.dataValues.typeProjet = {
          libelle: typeProjet.Libelle,
          id: typeProjet.idType
        };

        createdEtapes.push(newEtape);
      }

      await t.commit();
      console.log(`Created ${createdEtapes.length} etapes`);

      return reply.code(201).send({
        success: true,
        message: `Successfully created ${createdEtapes.length} etape(s)`,
        data: createdEtapes
      });

    } catch (error) {
      await t.rollback();
      console.error('Error creating etapes:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  deleteEtape: async (request, reply) => {
    const { etapeId } = request.params;
    const t = await sequelize.transaction();

    try {
      // 1. Find etape with its associations
      const etape = await Etape.findOne({
        where: { idEtape: etapeId },
        include: [
          { 
            model: Document,
            as: 'documents'
          },
          {
            model: TypeProjet,
            as: 'typeProjets'
          }
        ],
        transaction: t
      });

      if (!etape) {
        await t.rollback();
        return reply.code(404).send({
          success: false,
          error: 'Not Found',
          message: 'Etape not found'
        });
      }

      // 2. Check if etape has associated documents
      if (etape.documents?.length > 0) {
        await t.rollback();
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Cannot delete etape with associated documents'
        });
      }

      // 3. Remove associations with TypeProjets
      await etape.setTypeProjets([], { transaction: t });

      // 4. Delete the etape
      await etape.destroy({ transaction: t });

      await t.commit();

      return reply.send({
        success: true,
        message: 'Etape deleted successfully',
        data: {
          idEtape: etape.idEtape,
          LibelleEtape: etape.LibelleEtape
        }
      });

    } catch (error) {
      await t.rollback();
      console.error('Error deleting etape:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  },

  getEtapesByRoleName: async (request, reply) => {
    try {
      const { roleName } = request.params;

      // Find the role first with proper alias for etapes
      const role = await Role.findOne({
        where: { name: roleName },
        include: [{
          model: Etape,
          as: 'etapes', // Add the correct alias here
          attributes: [
            'idEtape',
            'LibelleEtape',
            'Description',
            'sequenceNumber',
            'Validation'
          ],
          include: [{
            model: TypeProjet,
            as: 'typeProjets',
            through: 'EtapeTypeProjet',
            attributes: ['idType', 'Libelle', 'Description']
          }]
        }]
      });

      if (!role) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: `Role "${roleName}" not found`
        });
      }

      // Sort etapes by sequence number
      const sortedEtapes = role.etapes.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

      return reply.send({
        success: true,
        role: {
          id: role.idRole,
          name: role.name,
          description: role.description
        },
        count: sortedEtapes.length,
        data: sortedEtapes
      });

    } catch (error) {
      console.error('Error fetching etapes by role name:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = etapeController;
