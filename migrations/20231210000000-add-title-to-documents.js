'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if the column exists first
    const tableInfo = await queryInterface.describeTable('Documents');
    if (!tableInfo.Title) {
      await queryInterface.addColumn('Documents', 'Title', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'idDocument' // Position the column after idDocument
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Check if the column exists before trying to remove it
    const tableInfo = await queryInterface.describeTable('Documents');
    if (tableInfo.Title) {
      await queryInterface.removeColumn('Documents', 'Title');
    }
  }
};
