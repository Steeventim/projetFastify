const { Etape } = require('../models');

const etapeController = {
  createEtape: async (request, reply) => {
    const { Libelle, Description } = request.body;

    try {
      const newEtape = await Etape.create({
        Libelle,
        Description
      });

      return reply.status(201).send(newEtape);
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  }
};

module.exports = etapeController;
