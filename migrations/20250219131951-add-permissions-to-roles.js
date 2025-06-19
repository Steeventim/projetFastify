'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Check if the column exists first
      const tableInfo = await queryInterface.describeTable('Roles');
      
      if (!tableInfo.permissions) {
        // Add the column only if it doesn't exist
        await queryInterface.addColumn('Roles', 'permissions', {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true
        });
        console.log('Added permissions column to Roles table');
      } else {
        console.log('Permissions column already exists in Roles table, skipping migration');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable('Roles');
      if (tableInfo.permissions) {
        await queryInterface.removeColumn('Roles', 'permissions');
        console.log('Removed permissions column from Roles table');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};
