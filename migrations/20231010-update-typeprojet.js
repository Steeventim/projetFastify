'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('TypeProjets', 'DateDemande');
    await queryInterface.addColumn('TypeProjets', 'Description', {
      type: Sequelize.STRING,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('TypeProjets', 'DateDemande', {
      type: Sequelize.DATE,
    });
    await queryInterface.removeColumn('TypeProjets', 'Description');
  }
};
