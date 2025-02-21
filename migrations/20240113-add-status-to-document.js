'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Documents', 'status', {
      type: Sequelize.ENUM('verified', 'pending', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Documents', 'status');
  }
};
