'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Documents', 'label', 'Title');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Documents', 'Title', 'label');
  }
};
