'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Documents', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'active' // Adjust as needed
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Documents', 'status', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: null // Revert to previous state if needed
    });
  }
};