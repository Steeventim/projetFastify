'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the column exists first
      const tableInfo = await queryInterface.describeTable('Documents');
      
      if (!tableInfo.UserDestinatorName) {
        // Add the column only if it doesn't exist
        await queryInterface.addColumn('Documents', 'UserDestinatorName', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('Added UserDestinatorName column to Documents table');
      } else {
        console.log('UserDestinatorName column already exists in Documents table, skipping migration');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('Documents');
      if (tableInfo.UserDestinatorName) {
        await queryInterface.removeColumn('Documents', 'UserDestinatorName');
        console.log('Removed UserDestinatorName column from Documents table');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};
