const { Projet } = require('../models');
const { v4: uuidv4 } = require('uuid');

const projetController = {
  createProjet: async (request, reply) => {
    try {
      const projet = await Projet.create(request.body);
      return reply.code(201).send(projet);
    } catch (error) {
      console.error('Error creating projet:', error);
      return reply.code(500).send({ error: 'Error creating projet' });
    }
  },

  getAllProjets: async (request, reply) => {
    try {
      const projets = await Projet.findAll({
        order: [['createdAt', 'DESC']]
      });
      return reply.send(projets);
    } catch (error) {
      console.error('Error fetching projets:', error);
      return reply.code(500).send({ error: 'Error fetching projets' });
    }
  }
};

module.exports = projetController;
