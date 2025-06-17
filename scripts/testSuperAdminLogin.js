#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testSuperAdminLogin() {
  try {
    const email = process.env.SUPERADMIN_EMAIL || 'steeventimnou@gmail.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@2025!';
    const serverUrl = `http://localhost:${process.env.PORT || 3003}`;

    console.log('🧪 Testing SuperAdmin Login...');
    console.log(`📧 Email: ${email}`);
    console.log(`🌐 Server: ${serverUrl}`);
    console.log('');

    // Test login
    const response = await axios.post(`${serverUrl}/users/login`, {
      Email: email,
      Password: password
    });

    if (response.status === 200) {
      const { token, user } = response.data;
      
      console.log('✅ Login successful!');
      console.log('👤 User Info:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.prenomUser} ${user.nomUser}`);
      console.log(`   SuperAdmin: ${user.isSuperAdmin}`);
      console.log(`   Roles: ${user.roles.map(r => r.name).join(', ')}`);
      console.log(`   Last Login: ${user.lastLogin}`);
      console.log('');
      console.log('🔑 Token (first 50 chars):');
      console.log(`   ${token.substring(0, 50)}...`);
      
      // Test a protected route
      console.log('');
      console.log('🔒 Testing protected route...');
      
      const protectedResponse = await axios.get(`${serverUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (protectedResponse.status === 200) {
        console.log('✅ Protected route access successful!');
        console.log('🛡️  SuperAdmin has full access to the system');
      }

    }

  } catch (error) {
    console.error('❌ Login failed!');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('   Server is not responding. Make sure the server is running on port', process.env.PORT || 3003);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure the server is running: npm start');
    console.log('   2. Make sure the database is running');
    console.log('   3. Make sure the superadmin was created: npm run create-superadmin');
    console.log('   4. Check the .env file for correct credentials');
  }
}

testSuperAdminLogin();
