'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add foreign key constraint for documentId in Commentaires
      await queryInterface.addConstraint('Commentaires', {
        fields: ['documentId'],
        type: 'foreign key',
        name: 'fk_commentaire_document',
        references: {
          table: 'Documents',
          field: 'idDocument'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Add index for better query performance
      await queryInterface.addIndex('Commentaires', ['documentId'], {
        name: 'idx_commentaire_document'
      });

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove foreign key constraint
      await queryInterface.removeConstraint('Commentaires', 'fk_commentaire_document');
      
      // Remove index
      await queryInterface.removeIndex('Commentaires', 'idx_commentaire_document');

    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};