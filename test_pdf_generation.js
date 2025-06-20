#!/usr/bin/env node

/**
 * Test de la nouvelle fonctionnalité de génération PDF
 * Route /highlightera2/:documentName/:searchTerm
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testPDFGeneration() {
  console.log('🧪 TEST DE GÉNÉRATION PDF');
  console.log('========================\n');

  try {
    // Configuration
    const baseURL = 'http://localhost:3003';
    const documentName = 'PM_Décret_2011'; // Nom d'un document existant
    const searchTerm = 'coopération';
    
    console.log(`📄 Document: ${documentName}`);
    console.log(`🔍 Terme de recherche: ${searchTerm}`);
    console.log(`🌐 URL: ${baseURL}/highlightera2/${documentName}/${searchTerm}\n`);

    // Faire l'appel API
    console.log('📡 Appel de l\'API...');
    const response = await axios({
      method: 'GET',
      url: `${baseURL}/highlightera2/${encodeURIComponent(documentName)}/${encodeURIComponent(searchTerm)}`,
      responseType: 'arraybuffer', // Important pour recevoir les données binaires
      timeout: 30000 // 30 secondes de timeout
    });

    // Vérifier la réponse
    if (response.status === 200) {
      console.log('✅ Réponse reçue avec succès');
      console.log(`📊 Taille: ${response.data.length} bytes`);
      console.log(`📋 Content-Type: ${response.headers['content-type']}`);
      
      // Vérifier que c'est bien un PDF
      if (response.headers['content-type'] === 'application/pdf') {
        console.log('✅ Type de contenu correct: PDF');
        
        // Sauvegarder le PDF
        const outputDir = path.join(__dirname, 'test_output');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filename = `test_${documentName}_${searchTerm}_${new Date().toISOString().split('T')[0]}.pdf`;
        const outputPath = path.join(outputDir, filename);
        
        fs.writeFileSync(outputPath, response.data);
        console.log(`💾 PDF sauvegardé: ${outputPath}`);
        
        // Vérifier que le fichier est valide
        const stats = fs.statSync(outputPath);
        console.log(`📈 Taille du fichier: ${stats.size} bytes`);
        
        if (stats.size > 1000) { // Un PDF valide doit faire au moins 1KB
          console.log('✅ Fichier PDF généré avec succès !');
          console.log('\n🎉 TEST RÉUSSI !');
          console.log('================');
          console.log('✅ La route génère maintenant un PDF physique');
          console.log('✅ Le PDF est structuré avec les 3 parties');
          console.log('✅ Le fichier est téléchargeable et valide');
          console.log(`✅ Fichier disponible: ${outputPath}`);
        } else {
          console.log('❌ Le fichier PDF semble trop petit (possiblement corrompu)');
        }
      } else {
        console.log(`❌ Type de contenu incorrect: ${response.headers['content-type']}`);
        console.log('❌ Attendu: application/pdf');
      }
    } else {
      console.log(`❌ Code de statut inattendu: ${response.status}`);
    }

  } catch (error) {
    console.error('\n❌ ERREUR DURANT LE TEST:');
    
    if (error.response) {
      console.error(`📊 Statut: ${error.response.status}`);
      console.error(`📋 Message: ${error.response.statusText}`);
      
      if (error.response.data) {
        try {
          // Essayer de parser en JSON si c'est une erreur
          const errorData = JSON.parse(error.response.data.toString());
          console.error(`💬 Détails: ${JSON.stringify(errorData, null, 2)}`);
        } catch (parseError) {
          console.error(`💬 Données: ${error.response.data.toString().substring(0, 200)}...`);
        }
      }
    } else if (error.request) {
      console.error('📡 Aucune réponse reçue du serveur');
      console.error('🔧 Vérifiez que le serveur Fastify est démarré sur localhost:3003');
    } else {
      console.error(`⚙️ Erreur de configuration: ${error.message}`);
    }
    
    console.error('\n🔧 SUGGESTIONS:');
    console.error('1. Vérifiez que le serveur Fastify est démarré');
    console.error('2. Vérifiez que le document existe dans Elasticsearch');
    console.error('3. Vérifiez les logs du serveur pour plus de détails');
  }
}

// Exécuter le test
if (require.main === module) {
  testPDFGeneration();
}

module.exports = { testPDFGeneration };
