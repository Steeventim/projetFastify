// Test simple pour vérifier l'extraction du path.real
const { Client } = require('@elastic/elasticsearch');

async function testPathReal() {
  try {
    const esClient = new Client({
      node: 'http://localhost:9200',
      maxRetries: 3,
      requestTimeout: 30000,
    });

    // Faire une recherche simple
    const searchResponse = await esClient.search({
      index: 'projet_search',
      body: {
        query: {
          match: {
            content: 'collectivités'
          }
        },
        size: 1
      }
    });

    if (searchResponse.body.hits.hits.length > 0) {
      const hit = searchResponse.body.hits.hits[0];
      console.log('Document trouvé:', hit._source.file?.filename || 'nom inconnu');
      
      // Extraire le path.real comme dans notre code modifié
      const physicalPath = hit._source.path?.real || 
                         hit._source.file?.path?.real || 
                         hit._source.file?.path || 
                         'Document non trouvé localement';
      
      console.log('Path.real extrait:', physicalPath);
      
      // Vérifier si le fichier existe
      const fs = require('fs');
      if (fs.existsSync(physicalPath)) {
        console.log('✅ Le fichier existe au chemin:', physicalPath);
        console.log('✅ SUCCESS: L\'extraction du path.real fonctionne!');
      } else {
        console.log('❌ Le fichier n\'existe pas au chemin:', physicalPath);
      }
    } else {
      console.log('❌ Aucun document trouvé dans Elasticsearch');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testPathReal().then(() => {
  console.log('\nTest terminé');
  process.exit(0);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
