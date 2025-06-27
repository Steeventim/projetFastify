// Migration: Alter Documents.Title to TEXT (PostgreSQL)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change the Title column to TEXT
    await queryInterface.changeColumn('Documents', 'Title', {
      type: Sequelize.TEXT,
      allowNull: true // or false, depending on your requirements
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert Title column to VARCHAR(255)
    await queryInterface.changeColumn('Documents', 'Title', {
      type: Sequelize.STRING(255),
      allowNull: true // or false, depending on your requirements
    });
  }
};
