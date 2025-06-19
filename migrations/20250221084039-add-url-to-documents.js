'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Check if the column exists first
      const tableInfo = await queryInterface.describeTable('Documents');
      
      if (!tableInfo.url) {
        // Add the column only if it doesn't exist
        await queryInterface.addColumn('Documents', 'url', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('Added url column to Documents table');
      } else {
        console.log('URL column already exists in Documents table, skipping migration');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('Documents');
      if (tableInfo.url) {
        await queryInterface.removeColumn('Documents', 'url');
        console.log('Removed url column from Documents table');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};
