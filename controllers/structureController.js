const { Structure } = require('../models');

const structureController = {
  createStructure: async (request, reply) => {
    const { NomStructure, DescriptionStructure } = request.body;

    try {
      // Validate input
      if (!NomStructure) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'NomStructure is required'
        });
      }

      // Create the structure
      const newStructure = await Structure.create({
        NomStructure,
        DescriptionStructure
      });

      return reply.status(201).send(newStructure);
    } catch (error) {
      console.error('Create structure error:', error);
      return reply.status(500).send({ error: error.message });
    }
  },
  getAllStructures: async (request, reply) => {
    try {
      const structures = await Structure.findAll({
        order: [['createdAt', 'DESC']]
      });
      return reply.send(structures);
    } catch (error) {
      console.error('Error fetching structures:', error);
      return reply.code(500).send({ error: 'Error fetching structures' });
    }
  }
};

module.exports = structureController;