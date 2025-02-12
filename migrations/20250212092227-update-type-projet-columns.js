'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First check TypeProjets structure and update if needed
      const hasTypeProjects = await queryInterface.tableExists('TypeProjets');
      
      if (!hasTypeProjects) {
        await queryInterface.createTable('TypeProjets', {
          idType: {  // Using idType instead of idTypeProjet to match existing schema
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
          },
          Libelle: {
            type: Sequelize.STRING,
            allowNull: false
          },
          Description: Sequelize.STRING,
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          }
        });
      }

      // Create the junction table with correct column references
      const hasJunctionTable = await queryInterface.tableExists('EtapeTypeProjet');
      
      if (!hasJunctionTable) {
        await queryInterface.createTable('EtapeTypeProjet', {
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
          typeProjetId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'TypeProjets',
              key: 'idType'  // Changed to match the actual column name
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
          }
        });

        // Add unique constraint
        await queryInterface.addConstraint('EtapeTypeProjet', {
          fields: ['etapeId', 'typeProjetId'],
          type: 'unique',
          name: 'unique_etape_type_projet'
        });
      }

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove tables in reverse order
      await queryInterface.dropTable('EtapeTypeProjet');
    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};