const searchService = require('./services/searchService');

async function testPhysicalPathExtraction() {
  try {
    console.log('=== Test de l\'extraction du path.real ===');
    
    // Test avec le document que nous savons être dans Elasticsearch
    const documentName = 'CDL02424122019FR';
    const searchTerm = 'collectivités';
    
    console.log(`\nTesting with document: ${documentName}`);
    console.log(`Search term: ${searchTerm}`);
    
    // Appeler generateDocumentPreview qui devrait maintenant utiliser path.real
    const previewResult = await searchService.generateDocumentPreview(documentName, searchTerm);
    
    if (previewResult) {
      console.log('\n=== Résultat de la prévisualisation ===');
      console.log('Nom du fichier:', previewResult.documentInfo.filename);
      console.log('Chemin physique:', previewResult.documentInfo.physicalPath);
      console.log('Type de prévisualisation:', previewResult.documentInfo.previewType);
      console.log('Pages totales:', previewResult.documentInfo.totalPages);
      console.log('Correspondances trouvées:', previewResult.searchInfo.matchCount);
      
      // Vérifier si le chemin physique correspond à celui d'Elasticsearch
      if (previewResult.documentInfo.physicalPath.includes('/home/tims/Documents/Others/')) {
        console.log('\n✅ SUCCESS: Le path.real d\'Elasticsearch a été utilisé correctement!');
      } else {
        console.log('\n⚠️  Le chemin semble être un fallback, pas le path.real d\'Elasticsearch');
      }
    } else {
      console.log('❌ Aucune prévisualisation générée');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Exécuter le test
testPhysicalPathExtraction().then(() => {
  console.log('\n=== Test terminé ===');
  process.exit(0);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
