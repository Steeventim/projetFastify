'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.createTable('UserRoles', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'idUser'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        roleId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'Roles',
            key: 'idRole'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      // Add unique constraint
      await queryInterface.addConstraint('UserRoles', {
        fields: ['userId', 'roleId'],
        type: 'unique',
        name: 'unique_user_role_combination'
      });

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Drop the table (this will automatically remove associated constraints)
      await queryInterface.dropTable('UserRoles', {
        cascade: true,
        force: true
      });
    } catch (error) {
      console.error('Rollback Error:', error);
      throw error;
    }
  }
};