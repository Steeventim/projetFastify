'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if id column exists
      const tableInfo = await queryInterface.describeTable('UserRoles');
      
      if (!tableInfo.id) {
        await queryInterface.addColumn('UserRoles', 'id', {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        });
      } else {
        // Update existing id column if needed
        await queryInterface.changeColumn('UserRoles', 'id', {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        });
      }
    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('UserRoles');
      if (tableInfo.id) {
        await queryInterface.removeColumn('UserRoles', 'id');
      }
    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};