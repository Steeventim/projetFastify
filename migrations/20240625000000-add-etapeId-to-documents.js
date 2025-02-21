'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Documents', 'etapeId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Etapes',
        key: 'idEtape'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Documents', 'etapeId');
  }
};
