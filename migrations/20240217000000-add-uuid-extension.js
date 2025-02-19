'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      console.log('UUID extension added successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "uuid-ossp";');
      console.log('UUID extension removed successfully');
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};