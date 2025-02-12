'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if superadmin role exists
    const existingRole = await queryInterface.sequelize.query(
      `SELECT "idRole" FROM "Roles" WHERE name = 'superadmin'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let roleId;
    
    if (existingRole.length === 0) {
      // Create the superadmin role if it doesn't exist
      roleId = uuidv4();
      await queryInterface.bulkInsert('Roles', [{
        idRole: roleId,
        name: 'superadmin',
        description: 'Super Administrator with full system access',
        isSystemRole: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    } else {
      roleId = existingRole[0].idRole;
    }

    // Check if superadmin user exists
    const existingUser = await queryInterface.sequelize.query(
      `SELECT "idUser" FROM "Users" WHERE "Email" = 'laurentjoel52@gmail.com'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    let userId;

    if (existingUser.length === 0) {
      // Create the superadmin user if it doesn't exist
      userId = uuidv4();
      const hashedPassword = await bcrypt.hash('mkounga10', 10);
      
      await queryInterface.bulkInsert('Users', [{
        idUser: userId,
        Email: 'laurentjoel52@gmail.com',
        Password: hashedPassword,
        NomUser: 'SuperSuper',
        PrenomUser: 'Admin',
        IsActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    } else {
      userId = existingUser[0].idUser;
    }

    // Check if user-role association exists
    const existingUserRole = await queryInterface.sequelize.query(
      `SELECT id FROM "UserRoles" WHERE "userId" = :userId AND "roleId" = :roleId`,
      {
        replacements: { userId, roleId },
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (existingUserRole.length === 0) {
      // Create the user-role association if it doesn't exist
      await queryInterface.bulkInsert('UserRoles', [{
        id: uuidv4(),
        userId: userId,
        roleId: roleId,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove in reverse order
    await queryInterface.bulkDelete('UserRoles', {});
    await queryInterface.bulkDelete('Users', { 
      Email: 'laurentjoel52@gmail.com' 
    });
    await queryInterface.bulkDelete('Roles', { 
      name: 'superadmin' 
    });
  }
};