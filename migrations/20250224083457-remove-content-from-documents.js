'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Check if the column exists first
      const tableInfo = await queryInterface.describeTable('Documents');
      
      if (tableInfo.content) {
        // Remove the column only if it exists
        await queryInterface.removeColumn('Documents', 'content');
        console.log('Removed content column from Documents table');
      } else {
        console.log('Content column does not exist in Documents table, skipping migration');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('Documents');
      if (!tableInfo.content) {
        await queryInterface.addColumn('Documents', 'content', {
          type: Sequelize.JSON,
          allowNull: true
        });
        console.log('Added content column to Documents table');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};
