const { TypeProjet } = require('../models');
const { v4: uuidv4 } = require('uuid');

const ProjetController = {
  createTypeProjet: async (request, reply) => {
    try {
      const { Libelle, Description } = request.body;

      if (!Libelle) {
        return reply.code(400).send({ 
          error: 'Libelle is required' 
        });
      }

      const newTypeProjet = await TypeProjet.create({
        idType: uuidv4(),
        Libelle,
        Description
      });

      return reply.code(201).send(newTypeProjet);
    } catch (error) {
      console.error('Error creating type projet:', error);
      return reply.code(500).send({ 
        error: 'Failed to create type projet',
        details: error.message 
      });
    }
  },

  getAllTypeProjets: async (request, reply) => {
    try {
      const typeProjets = await TypeProjet.findAll({
        order: [['createdAt', 'DESC']]
      });
      return reply.send(typeProjets);
    } catch (error) {
      console.error('Error fetching type projets:', error);
      return reply.code(500).send({ 
        error: 'Error fetching type projets',
        details: error.message 
      });
    }
  }
};

module.exports = ProjetController;