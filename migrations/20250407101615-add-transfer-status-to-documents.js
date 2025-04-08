// "use strict";

// /** @type {import('sequelize-cli').Migration} */
// module.exports = {
//   async up(queryInterface, Sequelize) {
//     const tableInfo = await queryInterface.describeTable("Documents");
//     if (!tableInfo.transferStatus) {
//       await queryInterface.addColumn("Documents", "transferStatus", {
//         type: Sequelize.STRING,
//         allowNull: false,
//         defaultValue: "pending", // Initial state
//       });
//     }

//     await queryInterface.sequelize.query(
//       `INSERT INTO "SequelizeMeta" (name) VALUES ('20250407101615-add-transfer-status-to-documents.js');`
//     );
//   },

//   async down(queryInterface, Sequelize) {
//     const tableInfo = await queryInterface.describeTable("Documents");
//     if (tableInfo.transferStatus) {
//       await queryInterface.removeColumn("Documents", "transferStatus");
//     }
//   },
// };
