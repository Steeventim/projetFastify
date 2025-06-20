#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3003';

const testAdmin = {
  Email: 'steeventimnou@gmail.com',
  Password: 'SuperAdmin@2025!'
};

async function login() {
  try {
    console.log('🔐 Connexion admin...');
    const response = await axios.post(`${BASE_URL}/users/login`, testAdmin);
    console.log('✅ Connexion réussie');
    return response.data.token;
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.response?.data || error.message);
    return null;
  }
}

async function testDashboardRoute(token, route, name) {
  try {
    console.log(`\n🧪 Test ${name}...`);
    const response = await axios.get(`${BASE_URL}${route}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ ${name}: ${response.status} - ${response.statusText}`);
    return true;
  } catch (error) {
    const status = error.response?.status || 'Error';
    const message = error.response?.data?.message || error.message;
    console.log(`❌ ${name}: ${status} - ${message}`);
    return false;
  }
}

async function testAllRoutes() {
  console.log('🚀 Test des routes Dashboard Admin\n');
  
  const token = await login();
  if (!token) {
    console.log('❌ Impossible de continuer sans token');
    return;
  }

  const routes = [
    { path: '/admin/dashboard/test', name: 'Test Access' },
    { path: '/admin/dashboard/overview', name: 'Overview' },
    { path: '/admin/dashboard/users', name: 'User Stats' },
    { path: '/admin/dashboard/documents', name: 'Document Stats' },
    { path: '/admin/dashboard/notifications', name: 'Notification Stats' },
    { path: '/admin/dashboard/workflow', name: 'Workflow Stats' },
    { path: '/admin/dashboard/files', name: 'File Stats' },
    { path: '/admin/dashboard/metrics', name: 'System Metrics' },
    { path: '/admin/dashboard/realtime', name: 'Real-time Data' },
    { path: '/admin/dashboard/complete', name: 'Complete Data' }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const route of routes) {
    const success = await testDashboardRoute(token, route.path, route.name);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Pause entre les requêtes pour éviter le rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Résultats:');
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Échecs: ${failCount}`);
  console.log(`📈 Total: ${routes.length}`);

  if (failCount === 0) {
    console.log('\n🎉 Tous les tests sont passés !');
  } else {
    console.log(`\n⚠️  ${failCount} tests ont échoué`);
  }
}

// Exécuter les tests
testAllRoutes().catch(console.error);