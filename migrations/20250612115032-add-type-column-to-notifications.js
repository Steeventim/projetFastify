'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
      // Check if the column exists first
      const tableInfo = await queryInterface.describeTable("Notifications");
      
      if (!tableInfo.type) {
        // Add the column only if it doesn't exist
        await queryInterface.addColumn("Notifications", "type", {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('Added type column to Notifications table');
      } else {
        console.log('Type column already exists in Notifications table, skipping migration');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    try {
      const tableInfo = await queryInterface.describeTable("Notifications");
      if (tableInfo.type) {
        await queryInterface.removeColumn("Notifications", "type");
        console.log('Removed type column from Notifications table');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};
