"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if the table exists
      const tableExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'Notifications'
        );`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (!tableExists[0].exists) {
        await queryInterface.createTable("Notifications", {
          idNotification: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          userId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: "Users", // Nom de la table des utilisateurs
              key: "idUser",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          isRead: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.fn("NOW"),
          },
        });
        console.log('Created Notifications table');
      } else {
        console.log('Notifications table already exists, skipping migration');
      }
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Check if the table exists before dropping it
      const tableExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'Notifications'
        );`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      
      if (tableExists[0].exists) {
        await queryInterface.dropTable("Notifications");
        console.log('Dropped Notifications table');
      } else {
        console.log('Notifications table does not exist, skipping drop');
      }
    } catch (error) {
      console.error('Error in migration rollback:', error);
      throw error;
    }
  },
};
