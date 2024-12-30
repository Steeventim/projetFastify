'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Documents', 'url');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Documents', 'url', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '' // Provide a default value if applicable
    });
  }
};