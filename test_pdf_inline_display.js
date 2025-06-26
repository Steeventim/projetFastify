// Script de test pour vérifier l'affichage inline du PDF
const axios = require('axios');

async function testPdfInlineDisplay() {
  try {
    console.log('🔍 Test de l\'affichage PDF inline...');
    
    // Configuration de la requête
    const baseUrl = 'http://localhost:3003';
    const documentName = 'test-document'; // Remplacer par un document existant
    const searchTerm = 'test';
    
    const url = `${baseUrl}/highlightera2/${encodeURIComponent(documentName)}/${encodeURIComponent(searchTerm)}`;
    
    console.log('📞 Appel de l\'API:', url);
    
    // Faire la requête avec axios
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer', // Important pour recevoir les données binaires
      validateStatus: function (status) {
        return status < 500; // Accepter les codes 4xx pour les tester
      }
    });
    
    console.log('📊 Réponse reçue:');
    console.log('- Status:', response.status);
    console.log('- Content-Type:', response.headers['content-type']);
    console.log('- Content-Disposition:', response.headers['content-disposition']);
    console.log('- Content-Length:', response.headers['content-length']);
    
    // Vérifier les headers
    if (response.headers['content-type'] === 'application/pdf') {
      console.log('✅ Content-Type correct: application/pdf');
    } else {
      console.log('❌ Content-Type incorrect:', response.headers['content-type']);
    }
    
    if (response.headers['content-disposition']) {
      const disposition = response.headers['content-disposition'];
      if (disposition.includes('inline')) {
        console.log('✅ Content-Disposition correct: PDF configuré pour affichage inline');
        console.log('   ->', disposition);
      } else if (disposition.includes('attachment')) {
        console.log('❌ Content-Disposition incorrect: PDF configuré pour téléchargement');
        console.log('   ->', disposition);
      } else {
        console.log('⚠️  Content-Disposition inhabituel:', disposition);
      }
    } else {
      console.log('⚠️  Header Content-Disposition manquant');
    }
    
    // Vérifier la taille du PDF
    if (response.data && response.data.length > 0) {
      console.log('✅ Données PDF reçues:', response.data.length, 'bytes');
      
      // Vérifier que c'est bien un PDF (commence par %PDF)
      const pdfHeader = response.data.slice(0, 4).toString();
      if (pdfHeader === '%PDF') {
        console.log('✅ Format PDF valide détecté');
      } else {
        console.log('❌ Format PDF invalide, en-tête:', pdfHeader);
      }
    } else {
      console.log('❌ Aucune donnée PDF reçue');
    }
    
    console.log('\n🎯 Résumé du test:');
    console.log('Le PDF devrait maintenant s\'afficher directement dans le navigateur');
    console.log('au lieu d\'être téléchargé automatiquement.');
    console.log('\n📋 Pour tester manuellement:');
    console.log('1. Ouvrez votre navigateur');
    console.log('2. Allez sur:', url);
    console.log('3. Le PDF devrait s\'afficher dans l\'onglet du navigateur');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.response) {
      console.log('📊 Détails de l\'erreur:');
      console.log('- Status:', error.response.status);
      console.log('- Data:', error.response.data ? error.response.data.toString() : 'Pas de données');
    }
  }
}

// Exécuter le test
testPdfInlineDisplay();
