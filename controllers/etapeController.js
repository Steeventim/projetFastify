const { Etape, TypeProjet, Document, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

const { EtapeTypeProjet } = require('../models'); // Import the EtapeTypeProjet model

const etapeController = {
  affectEtapeToDocument: async (request, reply) => {
  // Add logic to associate etape with typeProjet

    try {
      const { etapeName, documentName, typeProjetLibelle } = request.body; // Include typeProjetLibelle


      // Find the etape and document by their names
      const etape = await Etape.findOne({ where: { LibelleEtape: etapeName } });

      const document = await Document.findOne({ where: { Title: documentName } });


      if (!etape || !document) {
        return reply.code(404).send({
          success: false,
          message: 'Etape or Document not found'
        });
      }

      // Update the document to associate it with the etape
      document.etapeId = etape.id; // Assuming there's an etapeId field in the Document model
      await document.save();

      return reply.send({
        success: true,
        message: 'Etape associated with Document successfully',
        data: document
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

      return reply.send({
        success: true,
        count: formattedEtapes.length,
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
  }
};

module.exports = etapeController;
