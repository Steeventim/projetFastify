const { EtapeTypeProjet, Etape, TypeProjet } = require('../models');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async assignEtapeToTypeProjet(req, res) {
    try {
      const { etapeId, typeProjetId } = req.body;

      // Check if Etape and TypeProjet exist
      const etape = await Etape.findByPk(etapeId);
      const typeProjet = await TypeProjet.findByPk(typeProjetId);

      if (!etape || !typeProjet) {
        return res.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Etape or TypeProjet not found'
        });
      }

      // Create the association
      const etapeTypeProjet = await EtapeTypeProjet.create({
        id: uuidv4(),
        etapeId,
        typeProjetId
      });

      return res.status(201).send({
        statusCode: 201,
        message: 'Etape assigned to TypeProjet successfully',
        data: etapeTypeProjet
      });

    } catch (error) {
      console.error('Error assigning Etape to TypeProjet:', error);
      return res.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: error.message
      });
    }
  }
};