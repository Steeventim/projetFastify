'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const superadminEmail = process.env.SUPERADMIN_EMAIL || 'steeventimnou@gmail.com';
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@2025!';

    console.log(`Creating superadmin with email: ${superadminEmail}`);

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
      console.log('Created superadmin role');
    } else {
      roleId = existingRole[0].idRole;
      console.log('Superadmin role already exists');
    }

    // Check if the new superadmin user exists
    const existingUser = await queryInterface.sequelize.query(
      `SELECT "idUser" FROM "Users" WHERE "Email" = :email`,
      { 
        replacements: { email: superadminEmail },
        type: Sequelize.QueryTypes.SELECT 
      }
    );

    let userId;

    if (existingUser.length === 0) {
      // Create the new superadmin user
      userId = uuidv4();
      const hashedPassword = await bcrypt.hash(superadminPassword, 10);
      
      await queryInterface.bulkInsert('Users', [{
        idUser: userId,
        Email: superadminEmail,
        Password: hashedPassword,
        NomUser: 'Steeve',
        PrenomUser: 'Timnou',
        Telephone: '+237000000000',
        IsActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      console.log(`Created superadmin user: ${superadminEmail}`);
    } else {
      userId = existingUser[0].idUser;
      console.log('Superadmin user already exists');
      
      // Optionally update the password if user exists
      const hashedPassword = await bcrypt.hash(superadminPassword, 10);
      await queryInterface.sequelize.query(
        `UPDATE "Users" SET "Password" = :password, "updatedAt" = :updatedAt WHERE "Email" = :email`,
        {
          replacements: { 
            password: hashedPassword, 
            email: superadminEmail,
            updatedAt: new Date()
          },
          type: Sequelize.QueryTypes.UPDATE
        }
      );
      console.log('Updated superadmin password');
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
      console.log('Created superadmin user-role association');
    } else {
      console.log('Superadmin user-role association already exists');
    }

    // Remove old superadmin if it exists (optional - comment out if you want to keep both)
    const oldSuperadminEmail = 'laurentjoel52@gmail.com';
    const oldUser = await queryInterface.sequelize.query(
      `SELECT "idUser" FROM "Users" WHERE "Email" = :email`,
      { 
        replacements: { email: oldSuperadminEmail },
        type: Sequelize.QueryTypes.SELECT 
      }
    );

    if (oldUser.length > 0) {
      const oldUserId = oldUser[0].idUser;
      
      // Remove old user-role associations
      await queryInterface.bulkDelete('UserRoles', {
        userId: oldUserId
      });
      
      // Remove old user
      await queryInterface.bulkDelete('Users', {
        Email: oldSuperadminEmail
      });
      
      console.log(`Removed old superadmin: ${oldSuperadminEmail}`);
    }

    console.log('Superadmin setup completed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    const superadminEmail = process.env.SUPERADMIN_EMAIL || 'steeventimnou@gmail.com';
    
    // Remove user-role associations for this user
    const user = await queryInterface.sequelize.query(
      `SELECT "idUser" FROM "Users" WHERE "Email" = :email`,
      { 
        replacements: { email: superadminEmail },
        type: Sequelize.QueryTypes.SELECT 
      }
    );

    if (user.length > 0) {
      await queryInterface.bulkDelete('UserRoles', {
        userId: user[0].idUser
      });
      
      // Remove the user
      await queryInterface.bulkDelete('Users', { 
        Email: superadminEmail 
      });
    }

    console.log(`Removed superadmin: ${superadminEmail}`);
  }
};
