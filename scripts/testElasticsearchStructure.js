#!/usr/bin/env node

/**
 * Script pour tester la structure des données Elasticsearch
 * et vérifier comment extraire path.real
 */

const axios = require('axios');
const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3003';

// Configuration Elasticsearch
const esClient = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  maxRetries: 3,
  requestTimeout: 30000,
});

async function testElasticsearchStructure() {
  console.log('🔍 TEST: Structure des données Elasticsearch');
  console.log('=============================================');
  
  try {
    // Test 1: Connexion Elasticsearch directe
    console.log('\n📡 Test 1: Connexion directe à Elasticsearch');
    console.log('---------------------------------------------');
    
    try {
      const pingResult = await esClient.ping();
      console.log('✅ Elasticsearch est accessible');
      
      // Obtenir les informations du cluster
      const clusterInfo = await esClient.info();
      console.log(`📊 Version Elasticsearch: ${clusterInfo.version.number}`);
    } catch (esError) {
      console.log(`❌ Elasticsearch non accessible: ${esError.message}`);
      console.log('ℹ️  Passage aux tests API uniquement');
    }
    
    // Test 2: Recherche via l'API pour examiner la structure
    console.log('\n🔎 Test 2: Recherche via API pour examiner la structure');
    console.log('--------------------------------------------------------');
    
    try {
      const searchResponse = await axios.get(`${BASE_URL}/search-propositions/recouvrement`);
      
      if (searchResponse.data.success && searchResponse.data.data.hits.hits.length > 0) {
        console.log('✅ Recherche API réussie');
        
        const firstHit = searchResponse.data.data.hits.hits[0];
        console.log('\n📋 Structure du premier résultat:');
        console.log('----------------------------------');
        console.log('_source keys:', Object.keys(firstHit._source));
        
        // Examiner la structure file
        if (firstHit._source.file) {
          console.log('\n📁 Structure file:');
          console.log('  Keys:', Object.keys(firstHit._source.file));
          console.log('  File object:', JSON.stringify(firstHit._source.file, null, 2));
          
          // Vérifier path.real
          if (firstHit._source.file.path) {
            console.log('\n🛤️  Structure path:');
            console.log('  Path keys:', Object.keys(firstHit._source.file.path));
            console.log('  Path object:', JSON.stringify(firstHit._source.file.path, null, 2));
            
            if (firstHit._source.file.path.real) {
              console.log(`✅ path.real trouvé: ${firstHit._source.file.path.real}`);
            } else {
              console.log('❌ path.real non trouvé dans file.path');
            }
          } else {
            console.log('❌ path non trouvé dans file');
          }
        } else {
          console.log('❌ file non trouvé dans _source');
        }
        
        // Examiner si path.real est directement dans _source
        if (firstHit._source.path) {
          console.log('\n🛤️  Structure path directe:');
          console.log('  Path keys:', Object.keys(firstHit._source.path));
          console.log('  Path object:', JSON.stringify(firstHit._source.path, null, 2));
          
          if (firstHit._source.path.real) {
            console.log(`✅ path.real trouvé directement: ${firstHit._source.path.real}`);
          }
        }
        
        // Afficher toute la structure _source pour analyse
        console.log('\n📊 Structure complète _source:');
        console.log('-------------------------------');
        console.log(JSON.stringify(firstHit._source, null, 2));
        
      } else {
        console.log('❌ Aucun résultat trouvé');
      }
      
    } catch (apiError) {
      console.log(`❌ Erreur API: ${apiError.message}`);
      if (apiError.response) {
        console.log(`   Status: ${apiError.response.status}`);
        console.log(`   Data: ${JSON.stringify(apiError.response.data, null, 2)}`);
      }
    }
    
    // Test 3: Test spécifique avec un document connu
    console.log('\n📄 Test 3: Recherche directe Elasticsearch');
    console.log('-------------------------------------------');
    
    try {
      const directSearch = await esClient.search({
        index: process.env.INDEX || 'test2',
        body: {
          query: {
            match_all: {}
          },
          size: 1
        }
      });
      
      if (directSearch.hits.hits.length > 0) {
        const hit = directSearch.hits.hits[0];
        console.log('✅ Recherche directe réussie');
        console.log('\n📊 Structure complète du document Elasticsearch:');
        console.log('------------------------------------------------');
        console.log(JSON.stringify(hit._source, null, 2));
        
        // Tests spécifiques pour path.real
        console.log('\n🔍 Tests d\'extraction path.real:');
        console.log('----------------------------------');
        
        const testPaths = [
          'hit._source.file?.path?.real',
          'hit._source.path?.real', 
          'hit._source.file?.path',
          'hit._source.file?.filename'
        ];
        
        testPaths.forEach(pathExpr => {
          try {
            const value = eval(pathExpr);
            console.log(`✅ ${pathExpr}: ${value || 'undefined'}`);
          } catch (e) {
            console.log(`❌ ${pathExpr}: erreur - ${e.message}`);
          }
        });
      }
      
    } catch (directError) {
      console.log(`❌ Recherche directe échouée: ${directError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

// Exécuter le test
if (require.main === module) {
  testElasticsearchStructure()
    .then(() => {
      console.log('\n✅ Test terminé');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = { testElasticsearchStructure };
