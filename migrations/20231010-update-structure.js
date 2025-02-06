'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Structures', 'LogoStructure');
    await queryInterface.removeColumn('Structures', 'EmailStructure');
    await queryInterface.removeColumn('Structures', 'AddressStructure');
    await queryInterface.addColumn('Structures', 'DescriptionStructure', {
      type: Sequelize.STRING,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Structures', 'LogoStructure', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('Structures', 'EmailStructure', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('Structures', 'AddressStructure', {
      type: Sequelize.STRING,
    });
    await queryInterface.removeColumn('Structures', 'DescriptionStructure');
  }
};
