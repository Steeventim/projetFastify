// Migration: Alter Documents.url to TEXT (PostgreSQL)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Change the url column to TEXT
    await queryInterface.changeColumn('Documents', 'url', {
      type: Sequelize.TEXT,
      allowNull: true // or false, depending on your requirements
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert url column to VARCHAR(255)
    await queryInterface.changeColumn('Documents', 'url', {
      type: Sequelize.STRING(255),
      allowNull: true // or false, depending on your requirements
    });
  }
};
