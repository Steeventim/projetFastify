const { TypeProjet } = require('../models');
const { v4: uuidv4 } = require('uuid');

const createProjet = async (req, res) => {
  try {
    const { Libelle, Description } = req.body;

    // Validate required fields
    if (!Libelle) {
      return res.status(400).send({ error: 'Libelle is required' });
    }

    // Validate data types
    if (typeof Libelle !== 'string' || (Description && typeof Description !== 'string')) {
      return res.status(400).send({ error: 'Invalid data types provided' });
    }

    // Validate Libelle length
    if (Libelle.length > 255) {
      return res.status(400).send({ error: 'Libelle must be 255 characters or less' });
    }

    const newProjet = await TypeProjet.create({
      idType: uuidv4(),
      Libelle,
      Description
    });

    res.status(201).send(newProjet);
  } catch (error) {
    console.error('Error creating projet:', error);
    res.status(500).send({ error: 'Failed to create projet' });
  }
};

module.exports = {
  createProjet
};
