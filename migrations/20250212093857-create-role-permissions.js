'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table exists
      const tableExists = await queryInterface.tableExists('RolePermissions');
      
      if (!tableExists) {
        await queryInterface.createTable('RolePermissions', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true
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
          permissionId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'Permissions',
              key: 'idPermission'
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

        // Add unique constraint to prevent duplicate role-permission pairs
        await queryInterface.addConstraint('RolePermissions', {
          fields: ['roleId', 'permissionId'],
          type: 'unique',
          name: 'unique_role_permission'
        });

        // Add indexes for better query performance
        await queryInterface.addIndex('RolePermissions', ['roleId']);
        await queryInterface.addIndex('RolePermissions', ['permissionId']);
      }
    } catch (error) {
      console.error('Migration Error:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.dropTable('RolePermissions');
    } catch (error) {
      console.error('Migration Rollback Error:', error);
      throw error;
    }
  }
};