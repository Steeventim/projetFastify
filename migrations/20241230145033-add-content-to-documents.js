'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Add the column allowing NULL values
    await queryInterface.addColumn('Documents', 'content', {
      type: Sequelize.JSON,
      allowNull: true
    });

    // Step 2: Update existing rows with a default value
    await queryInterface.sequelize.query(
      'UPDATE "Documents" SET "content" = \'{}\' WHERE "content" IS NULL'
    );

    // Step 3: Alter the column to NOT NULL
    await queryInterface.changeColumn('Documents', 'content', {
      type: Sequelize.JSON,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Documents', 'content');
  }
};