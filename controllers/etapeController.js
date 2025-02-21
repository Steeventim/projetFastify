const db = require('../models');
const { v4: uuidv4 } = require('uuid');

const etapeController = {
  // Get all etapes
  getAllEtapes: async (request, reply) => {
    try {
      const etapes = await db.Etape.findAll({
        include: [{
          model: db.TypeProjet,
          through: { attributes: [] }
        }]
      });
      reply.code(200).send(etapes);
    } catch (error) {
      console.error('Error fetching etapes:', error);
      reply.code(500).send({ 
        error: error.message,
        details: 'An error occurred while fetching etapes'
      });
    }
  },

  createEtape: async (request, reply) => {

    const { LibelleEtape, Description, Validation, typeProjetLibelle } = request.body;

    try {
      // Validate input
      if (!LibelleEtape || !typeProjetLibelle) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'LibelleEtape and typeProjetLibelle are required'
        });
      }

      // Find TypeProjet by Libelle
      const typeProjet = await db.TypeProjet.findOne({
        where: { Libelle: typeProjetLibelle }
      });

      if (!typeProjet) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Type Projet with name "${typeProjetLibelle}" not found`
        });
      }

      // Get the max sequence number for this typeProjet
      const maxSequence = await db.Etape.max('sequenceNumber', {
        include: [{
          model: db.TypeProjet,
          where: { idType: typeProjet.idType },
          through: { attributes: [] }
        }]
      }) || 0;

      // Create the etape with next sequence number
      const newEtape = await db.Etape.create({
        idEtape: uuidv4(),
        LibelleEtape,
        Description,
        Validation,
        sequenceNumber: maxSequence + 1
      });

      // Create the association directly
      await db.EtapeTypeProjet.create({
        id: uuidv4(),
        etapeId: newEtape.idEtape,
        idType: typeProjet.idType
      });

      return reply.status(201).send({
        statusCode: 201,
        message: 'Etape created and assigned successfully',
        etape: newEtape,
        typeProjet: {
          Libelle: typeProjet.Libelle,
          idType: typeProjet.idType
        }
      });
    } catch (error) {
      console.error('Create etape error:', error);
      return reply.status(500).send({ error: error.message });
    }
  }
};

module.exports = etapeController;
