'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Permissions', {
      idPermission: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      LibellePerm: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Insert predefined permissions
    await queryInterface.bulkInsert('Permissions', [
      {
        idPermission: require('uuid').v4(),
        LibellePerm: 'Valider',
        description: 'Permission to validate',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        idPermission: require('uuid').v4(),
        LibellePerm: 'Rechercher',
        description: 'Permission to search',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        idPermission: require('uuid').v4(),
        LibellePerm: 'Transférer',
        description: 'Permission to transfer',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        idPermission: require('uuid').v4(),
        LibellePerm: 'Rejeter',
        description: 'Permission to reject',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create RolePermissions junction table
    await queryInterface.createTable('RolePermissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      roleId: {
        type: Sequelize.UUID,
        references: {
          model: 'Roles',
          key: 'idRole'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      permissionId: {
        type: Sequelize.UUID,
        references: {
          model: 'Permissions',
          key: 'idPermission'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('RolePermissions');
    await queryInterface.bulkDelete('Permissions', {
      LibellePerm: ['Valider', 'Rechercher', 'Transférer', 'Rejeter']
    });
    await queryInterface.dropTable('Permissions');
  },
};
