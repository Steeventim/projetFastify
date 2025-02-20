'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Documents', 'transferStatus', {
      type: Sequelize.ENUM('pending', 'sent', 'received', 'viewed'),
      defaultValue: 'pending'
    });

    await queryInterface.addColumn('Documents', 'transferTimestamp', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('Files', 'fileType', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.addColumn('Files', 'fileSize', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.addColumn('Files', 'thumbnailPath', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Documents', 'transferStatus');
    await queryInterface.removeColumn('Documents', 'transferTimestamp');
    await queryInterface.removeColumn('Files', 'fileType');
    await queryInterface.removeColumn('Files', 'fileSize');
    await queryInterface.removeColumn('Files', 'thumbnailPath');
  }
};
