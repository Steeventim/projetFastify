#!/usr/bin/env node

require('dotenv').config();

const fastify = require('fastify')({
  logger: {
    level: 'info'
  }
});

async function listRoutes() {
  try {
    // Importer et enregistrer les routes comme dans server.js
    const userRoutes = require('./routes/userRoutes');
    const fastifyRoleRoutes = require('./routes/fastifyRoleRoutes');
    const etapeRoutes = require('./routes/etapeRoutes');
    const searchRoutes = require('./routes/searchRoutes');
    const projetRoutes = require('./routes/projetRoutes');
    const structureRoutes = require('./routes/structureRoutes');
    const commentaireRoutes = require('./routes/commentaireRoutes');
    const etapeTypeProjetRoutes = require('./routes/etapeTypeProjetRoutes');
    const documentRoutes = require('./routes/documentRoutes');
    const initializationRoutes = require('./routes/initializationRoutes');
    const notificationRoutes = require('./routes/notificatonRoutes');

    // Enregistrer les routes
    await fastify.register(userRoutes);
    await fastify.register(fastifyRoleRoutes);
    await fastify.register(etapeRoutes);
    await fastify.register(searchRoutes);
    await fastify.register(projetRoutes);
    await fastify.register(structureRoutes);
    await fastify.register(commentaireRoutes);
    await fastify.register(etapeTypeProjetRoutes);
    await fastify.register(documentRoutes);
    await fastify.register(initializationRoutes);
    await fastify.register(notificationRoutes);

    // Attendre que toutes les routes soient enregistrées
    await fastify.ready();

    console.log('🚀 Routes enregistrées dans Fastify :');
    console.log('=' .repeat(60));

    // Parcourir toutes les routes
    const routes = [];
    fastify.printRoutes();

    // Alternative : utiliser la méthode interne pour obtenir les routes
    for (const route of fastify.routes) {
      const method = route.method;
      const url = route.url;
      
      if (url.includes('highlight') || url.includes('search') || url.includes('favicon')) {
        console.log(`🔍 ${method.padEnd(6)} ${url}`);
      }
      
      routes.push({ method, url });
    }

    console.log('\n📊 Statistiques :');
    console.log(`Total routes : ${routes.length}`);
    
    // Filtrer les routes de recherche
    const searchRoutesFound = routes.filter(r => 
      r.url.includes('search') || 
      r.url.includes('highlight') || 
      r.url.includes('favicon')
    );
    
    console.log(`Routes de recherche : ${searchRoutesFound.length}`);
    
    // Vérifier spécifiquement highlightera2
    const highlightera2Routes = routes.filter(r => r.url.includes('highlightera2'));
    console.log(`Routes highlightera2 : ${highlightera2Routes.length}`);
    
    if (highlightera2Routes.length === 0) {
      console.log('❌ PROBLÈME : Route highlightera2 non trouvée !');
    } else {
      console.log('✅ Route highlightera2 trouvée :');
      highlightera2Routes.forEach(route => {
        console.log(`   ${route.method} ${route.url}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors du listing des routes :', error.message);
    console.error(error.stack);
  } finally {
    await fastify.close();
  }
}

listRoutes();
