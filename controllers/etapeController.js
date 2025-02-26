const { Etape, TypeProjet, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

const etapeController = {
  getAllEtapes: async (request, reply) => {
    try {
      const etapes = await Etape.findAll({
        order: [['createdAt', 'DESC']]
      });

      return reply.send({
        success: true,
        data: etapes
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

  createEtape: async (request, reply) => {
    try {
      let etapes = request.body; // Accept an array of etapes
      if (!Array.isArray(etapes)) {
        etapes = [etapes]; // Wrap single object in an array
      }
      if (etapes.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Bad Request',
          message: 'An array of etapes is required'
        });
      }

      const createdEtapes = []; // Array to hold created etapes
      
      for (let i = 0; i < etapes.length; i++) {
        const etape = etapes[i];
        const { LibelleEtape, Description, Validation, typeProjetLibelle } = etape;

        if (!LibelleEtape) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Etape name is required'
          });
        }

        const newEtape = await Etape.create({
          id: uuidv4(),
          LibelleEtape,
          Description,
          Validation,
          typeProjetLibelle,
          sequenceNumber: i + 1, // Assign sequence number based on index
          createdAt: new Date(),
          updatedAt: new Date()
        });

        createdEtapes.push(newEtape); // Add created etape to the array
      }

      return reply.code(201).send({
        success: true,
        message: 'Etapes created successfully',
        data: createdEtapes
      });

    } catch (error) {
      console.error('Error creating etape:', error);
      return reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};

module.exports = etapeController;
