// filepath: /c:/Users/laure/CascadeProjects/Cenadi/migrations/XXXXXXXXXXXXXX-add-documentId-to-commentaire.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Commentaires', 'documentId', {
      type: Sequelize.UUID,
      references: {
        model: 'Documents',
        key: 'idDocument'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Commentaires', 'documentId');
  }
};