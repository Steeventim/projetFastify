'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Etapes', 'roleId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Roles',
        key: 'idRole'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Etapes', 'roleId');
  }
};
