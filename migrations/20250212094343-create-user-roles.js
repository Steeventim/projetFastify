'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Create UserRoles table
      await queryInterface.createTable('UserRoles', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
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

      // Add unique constraint to prevent duplicate user-role pairs
      await queryInterface.addConstraint('UserRoles', {
        fields: ['userId', 'roleId'],
        type: 'unique',
        name: 'unique_user_role'
      });

      // Add indexes for better query performance
      await queryInterface.addIndex('UserRoles', ['userId']);
      await queryInterface.addIndex('UserRoles', ['roleId']);

    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.dropTable('UserRoles');
    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};