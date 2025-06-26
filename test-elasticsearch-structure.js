const searchService = require('./services/searchService');

async function testElasticsearchStructure() {
  try {
    console.log('=== Test de la structure Elasticsearch ===');
    
    // Test avec un terme de recherche générique pour voir la structure des données
    const searchResponse = await searchService.searchWithHighlight('document');
    
    if (!searchResponse || searchResponse.hits.hits.length === 0) {
      console.log('Aucun résultat trouvé. Essayons avec un autre terme...');
      
      // Essayer avec d'autres termes
      const alternativeSearch = await searchService.searchWithHighlight('pdf');
      if (alternativeSearch && alternativeSearch.hits.hits.length > 0) {
        console.log('Structure trouvée avec le terme "pdf":');
        console.log(JSON.stringify(alternativeSearch.hits.hits[0], null, 2));
      } else {
        console.log('Aucun document trouvé dans Elasticsearch');
      }
      return;
    }
    
    console.log('\n=== Structure générale de la réponse ===');
    console.log('Total hits:', searchResponse.hits.total.value);
    console.log('Nombre de résultats:', searchResponse.hits.hits.length);
    
    console.log('\n=== Structure du premier hit ===');
    const firstHit = searchResponse.hits.hits[0];
    console.log('ID:', firstHit._id);
    console.log('Index:', firstHit._index);
    console.log('Score:', firstHit._score);
    
    console.log('\n=== Structure _source ===');
    console.log(JSON.stringify(firstHit._source, null, 2));
    
    console.log('\n=== Analyse des chemins possibles ===');
    const source = firstHit._source;
    
    // Vérifier toutes les propriétés liées aux chemins
    if (source.file) {
      console.log('source.file trouvé:');
      console.log('  - source.file.path:', source.file.path);
      console.log('  - source.file.path?.real:', source.file.path?.real);
      console.log('  - source.file.filename:', source.file.filename);
    }
    
    if (source.path) {
      console.log('source.path trouvé:');
      console.log('  - source.path:', source.path);
      console.log('  - source.path.real:', source.path.real);
    }
    
    if (source.filepath) {
      console.log('source.filepath trouvé:', source.filepath);
    }
    
    if (source.filename) {
      console.log('source.filename trouvé:', source.filename);
    }
    
    // Examiner toutes les propriétés disponibles
    console.log('\n=== Toutes les propriétés de _source ===');
    Object.keys(source).forEach(key => {
      console.log(`- ${key}: ${typeof source[key]}`);
    });
    
    console.log('\n=== Test d\'extraction du physicalPath ===');
    const physicalPath = source.file?.path?.real || 
                        source.path?.real || 
                        source.file?.path || 
                        source.filepath ||
                        source.filename ||
                        'Document non trouvé localement';
    
    console.log('Chemin physique extrait:', physicalPath);
    
  } catch (error) {
    console.error('Erreur lors du test:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Exécuter le test
testElasticsearchStructure().then(() => {
  console.log('\n=== Test terminé ===');
  process.exit(0);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
