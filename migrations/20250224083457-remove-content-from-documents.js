'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Documents', 'content');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('Documents', 'content', {
      type: Sequelize.JSON,
      allowNull: true
    });
  }
};
