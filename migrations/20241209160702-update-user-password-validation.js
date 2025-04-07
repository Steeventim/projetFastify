'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS password_strength_check;

      ALTER TABLE "Users"
      ADD CONSTRAINT password_strength_check
      CHECK (
        CASE 
          WHEN "Email" = 'laurentjoel52@gmail.com' THEN true 
          ELSE (
            length("Password") >= 8 AND
            "Password" ~ '[A-Z]' AND
            "Password" ~ '[a-z]' AND
            "Password" ~ '[0-9]' AND
            "Password" ~ '[^A-Za-z0-9]'
          )
        END
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS password_strength_check;
    `);
  }
};
