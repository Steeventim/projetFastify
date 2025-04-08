"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Notifications", "title", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "Notification", // Valeur par défaut si nécessaire
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Notifications", "title");
  },
};
