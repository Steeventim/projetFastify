#!/usr/bin/env node

/**
 * Test de la nouvelle route /highlightera2 pour la génération de PDF physique
 * Teste que la route retourne un PDF au lieu de JSON
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testPDFGenerationRoute() {
  console.log('🧪 TEST DE GÉNÉRATION PDF VIA ROUTE /highlightera2');
  console.log('================================================\n');

  try {
    // Configuration de la requête
    const documentName = 'PM_Décret_2011';
    const searchTerm = 'coopération';
    const url = `http://localhost:3003/highlightera2/${encodeURIComponent(documentName)}/${encodeURIComponent(searchTerm)}`;
    
    console.log(`📍 URL testée: ${url}`);
    console.log(`📄 Document: ${documentName}`);
    console.log(`🔍 Terme recherché: ${searchTerm}\n`);

    // Faire la requête avec axios configuré pour recevoir des données binaires
    console.log('🚀 Envoi de la requête...');
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer', // Important pour recevoir les données binaires du PDF
      timeout: 30000,
      headers: {
        'Accept': 'application/pdf'
      }
    });

    console.log('✅ Requête réussie !');
    console.log(`📊 Status Code: ${response.status}`);
    console.log(`📄 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']} bytes`);
    console.log(`📎 Content-Disposition: ${response.headers['content-disposition']}`);

    // Vérifier que la réponse est bien un PDF
    if (response.headers['content-type'] !== 'application/pdf') {
      throw new Error(`Type de contenu incorrect: ${response.headers['content-type']}, attendu: application/pdf`);
    }

    // Vérifier que nous avons des données
    if (!response.data || response.data.length === 0) {
      throw new Error('Aucune donnée reçue dans la réponse');
    }

    // Sauvegarder le PDF pour vérification
    const outputPath = path.join(__dirname, `test_output_${documentName}_${searchTerm}_${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, response.data);
    
    console.log(`💾 PDF sauvegardé: ${outputPath}`);
    console.log(`📏 Taille du fichier: ${response.data.length} bytes`);

    // Vérifier que le fichier commence par la signature PDF
    const pdfSignature = response.data.slice(0, 4).toString();
    if (pdfSignature !== '%PDF') {
      throw new Error(`Signature PDF incorrecte: ${pdfSignature}, attendu: %PDF`);
    }

    console.log('✅ Signature PDF valide détectée');

    // Analyser le nom de fichier suggéré
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) {
        console.log(`📋 Nom de fichier suggéré: ${filenameMatch[1]}`);
      }
    }

    console.log('\n🎉 TEST RÉUSSI !');
    console.log('================');
    console.log('✅ La route retourne bien un PDF physique');
    console.log('✅ Le Content-Type est correct (application/pdf)');
    console.log('✅ Le fichier PDF est valide');
    console.log('✅ Le téléchargement fonctionne');
    console.log(`✅ PDF généré avec succès: ${response.data.length} bytes`);

    return true;

  } catch (error) {
    console.error('\n❌ ERREUR DURANT LE TEST:');
    console.error('=========================');
    
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`);
      console.error(`📄 Content-Type: ${error.response.headers['content-type']}`);
      
      // Si la réponse est du JSON (erreur), l'afficher
      if (error.response.headers['content-type']?.includes('application/json')) {
        try {
          const errorData = JSON.parse(error.response.data.toString());
          console.error('📋 Réponse d\'erreur:', JSON.stringify(errorData, null, 2));
        } catch (parseError) {
          console.error('📋 Données de réponse:', error.response.data.toString().substring(0, 500));
        }
      }
    } else if (error.request) {
      console.error('❌ Pas de réponse du serveur');
      console.error(`📍 URL: ${error.config?.url}`);
    } else {
      console.error(`❌ ${error.message}`);
    }
    
    console.error(`🔍 Stack trace: ${error.stack}`);
    return false;
  }
}

// Fonction pour tester plusieurs scenarios
async function runComprehensiveTests() {
  console.log('🎯 TESTS COMPLETS DE GÉNÉRATION PDF');
  console.log('==================================\n');

  const testCases = [
    { document: 'PM_Décret_2011', term: 'coopération' },
    { document: 'test_document', term: 'exemple' },
    { document: 'décret', term: 'article' }
  ];

  let successCount = 0;
  
  for (const testCase of testCases) {
    console.log(`\n📋 Test ${successCount + 1}/${testCases.length}:`);
    console.log(`   Document: ${testCase.document}`);
    console.log(`   Terme: ${testCase.term}`);
    
    try {
      const result = await testPDFGenerationRoute(testCase.document, testCase.term);
      if (result) {
        successCount++;
        console.log('   ✅ Succès');
      }
    } catch (error) {
      console.log(`   ❌ Échec: ${error.message}`);
    }
    
    // Attendre un peu entre les tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 RÉSUMÉ FINAL:`);
  console.log(`   Réussis: ${successCount}/${testCases.length}`);
  console.log(`   Taux de succès: ${(successCount/testCases.length*100).toFixed(1)}%`);
}

// Exécution du test
if (require.main === module) {
  testPDFGenerationRoute()
    .then(() => {
      console.log('\n🏁 Test terminé');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erreur fatale:', error.message);
      process.exit(1);
    });
}

module.exports = { testPDFGenerationRoute, runComprehensiveTests };
