'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the column exists first
      const tableInfo = await queryInterface.describeTable('Documents');
      
      if (!tableInfo.status) {
        // Add the column only if it doesn't exist
        await queryInterface.addColumn('Documents', 'status', {
          type: Sequelize.ENUM('verified', 'pending', 'rejected'),
          allowNull: false,
          defaultValue: 'pending'
        });
        console.log('Added status column to Documents table');
      } else {
        console.log('Status column already exists in Documents table, skipping migration');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('Documents');
      if (tableInfo.status) {
        await queryInterface.removeColumn('Documents', 'status');
        console.log('Removed status column from Documents table');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};
