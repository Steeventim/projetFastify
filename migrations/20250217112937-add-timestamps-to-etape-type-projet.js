'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // First, check if the table exists
      await queryInterface.describeTable('EtapeTypeProjets');

      // Add createdAt column
      await queryInterface.addColumn('EtapeTypeProjets', 'createdAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });

      // Add updatedAt column
      await queryInterface.addColumn('EtapeTypeProjets', 'updatedAt', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });

    } catch (error) {
      // If table doesn't exist, create it
      await queryInterface.createTable('EtapeTypeProjets', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        etapeId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Etapes',
            key: 'idEtape'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        idType: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'TypeProjets',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('EtapeTypeProjets', 'createdAt');
      await queryInterface.removeColumn('EtapeTypeProjets', 'updatedAt');
    } catch (error) {
      await queryInterface.dropTable('EtapeTypeProjets');
    }
  }
};
