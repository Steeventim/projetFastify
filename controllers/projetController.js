const { TypeProjet } = require('../models');
const { v4: uuidv4 } = require('uuid');

const ProjetController = {
  createTypeProjet: async (request, reply) => {
    try {
  // Log incoming body for debugging
  console.log('createTypeProjet request.body:', request.body);
  const { Libelle, Description, structureId } = request.body || {};

      if (!Libelle) {
        return reply.code(400).send({
          error: 'Libelle is required',
        });
      }

      // Allow fallback to authenticated user's structureId if present
      const effectiveStructureId = structureId || request.user?.structureId || null;
      if (!effectiveStructureId) {
        return reply.code(400).send({
          error: 'structureId is required',
        });
      }

      const newTypeProjet = await TypeProjet.create({
        idType: uuidv4(),
        Libelle,
        Description,
        structureId: effectiveStructureId,
      });

      return reply.code(201).send(newTypeProjet);
    } catch (error) {
      console.error('Error creating type projet:', error);
      return reply.code(500).send({
        error: 'Failed to create type projet',
        details: error.message,
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
        details: error.message,
      });
    }
  }
};

module.exports = ProjetController;
