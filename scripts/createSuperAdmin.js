#!/usr/bin/env node

require('dotenv').config();
const { User, Role, UserRoles, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createSuperAdmin() {
  try {
    const email = process.env.SUPERADMIN_EMAIL || 'steeventimnou@gmail.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@2025!';
    const nomUser = 'Steeve';
    const prenomUser = 'Timnou';
    const telephone = '+237000000000';

    console.log('🚀 Creating SuperAdmin...');
    console.log(`📧 Email: ${email}`);

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // 1. Create or get superadmin role
      const [superadminRole, roleCreated] = await Role.findOrCreate({
        where: { name: 'superadmin' },
        defaults: {
          idRole: uuidv4(),
          name: 'superadmin',
          description: 'Super Administrator with full system access',
          isSystemRole: true
        },
        transaction
      });

      if (roleCreated) {
        console.log('✅ Created superadmin role');
      } else {
        console.log('ℹ️  Superadmin role already exists');
      }

      // 2. Check if user already exists
      let superadminUser = await User.findOne({
        where: { Email: email },
        transaction
      });

      if (superadminUser) {
        console.log('ℹ️  User already exists, updating password...');
        
        // Update existing user
        await superadminUser.update({
          Password: password, // Will be hashed by the model hook
          NomUser: nomUser,
          PrenomUser: prenomUser,
          Telephone: telephone,
          IsActive: true
        }, { transaction });
        
        console.log('✅ Updated existing user');
      } else {
        // Create new user
        superadminUser = await User.create({
          idUser: uuidv4(),
          Email: email,
          Password: password, // Will be hashed by the model hook
          NomUser: nomUser,
          PrenomUser: prenomUser,
          Telephone: telephone,
          IsActive: true
        }, { transaction });
        
        console.log('✅ Created new superadmin user');
      }

      // 3. Check if user-role association exists
      const existingAssociation = await UserRoles.findOne({
        where: {
          userId: superadminUser.idUser,
          roleId: superadminRole.idRole
        },
        transaction
      });

      if (!existingAssociation) {
        await UserRoles.create({
          id: uuidv4(),
          userId: superadminUser.idUser,
          roleId: superadminRole.idRole
        }, { transaction });
        
        console.log('✅ Created user-role association');
      } else {
        console.log('ℹ️  User-role association already exists');
      }

      // Commit transaction
      await transaction.commit();

      console.log('\n🎉 SuperAdmin created successfully!');
      console.log('📊 Summary:');
      console.log(`   📧 Email: ${email}`);
      console.log(`   👤 Name: ${prenomUser} ${nomUser}`);
      console.log(`   🔑 Role: superadmin`);
      console.log(`   ✅ Active: ${superadminUser.IsActive}`);
      
      console.log('\n🔐 You can now login with these credentials:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error creating SuperAdmin:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Check if user role exists and remove old superadmin if needed
async function cleanupOldSuperAdmin() {
  try {
    const oldEmail = 'laurentjoel52@gmail.com';
    const oldUser = await User.findOne({
      where: { Email: oldEmail },
      include: [{ model: Role }]
    });

    if (oldUser) {
      console.log(`🗑️  Found old superadmin: ${oldEmail}`);
      console.log('   Do you want to remove it? (This script will keep it by default)');
      // Uncomment the following lines if you want to automatically remove the old superadmin
      /*
      await UserRoles.destroy({ where: { userId: oldUser.idUser } });
      await oldUser.destroy();
      console.log('✅ Removed old superadmin');
      */
    }
  } catch (error) {
    console.warn('⚠️  Warning: Could not check for old superadmin:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🔧 SuperAdmin Creation Script');
  console.log('============================\n');

  await cleanupOldSuperAdmin();
  await createSuperAdmin();
}

// Run the script
main().catch(console.error);
