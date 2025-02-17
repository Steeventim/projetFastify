module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ...existing code...

    await queryInterface.createTable('EtapeTypeProjets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      idType: {
        type: Sequelize.UUID,
        references: {
          model: 'TypeProjets',
          key: 'idType'  // Updated to match the new primary key name
        },
        onDelete: 'CASCADE'
      },
      etapeId: {
        type: Sequelize.UUID,
        references: {
          model: 'Etapes',
          key: 'idEtape'
        },
        onDelete: 'CASCADE'
      },
      // ...existing code...
    });
  },
  // ...existing code...
};
