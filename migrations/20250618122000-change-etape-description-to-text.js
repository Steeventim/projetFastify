'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if the table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('Etapes')) {
        console.log('Etapes table does not exist, skipping migration');
        return;
      }

      // Get table definition
      const tableDefinition = await queryInterface.describeTable('Etapes');
      
      // Only modify if the Description column exists and is not already TEXT
      if (tableDefinition.Description && 
          tableDefinition.Description.type !== 'TEXT') {
        
        await queryInterface.changeColumn('Etapes', 'Description', {
          type: Sequelize.TEXT,
          allowNull: true
        });
        
        console.log('Changed Etapes.Description column from VARCHAR(255) to TEXT');
      } else {
        console.log('Etapes.Description is already TEXT or does not exist, skipping');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if the table exists
      const tables = await queryInterface.showAllTables();
      if (!tables.includes('Etapes')) {
        console.log('Etapes table does not exist, skipping migration rollback');
        return;
      }

      // Get table definition
      const tableDefinition = await queryInterface.describeTable('Etapes');
      
      // Only modify if the Description column exists and is TEXT
      if (tableDefinition.Description && 
          tableDefinition.Description.type === 'TEXT') {
        
        await queryInterface.changeColumn('Etapes', 'Description', {
          type: Sequelize.STRING(255),
          allowNull: true
        });
        
        console.log('Changed Etapes.Description column from TEXT back to VARCHAR(255)');
      } else {
        console.log('Etapes.Description is not TEXT or does not exist, skipping rollback');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  }
};
