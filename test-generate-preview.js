const searchService = require('./services/searchService');

async function testGenerateDocumentPreview() {
  try {
    console.log('=== Test generateDocumentPreview avec path.real ===');
    
    const documentName = 'CDL02424122019FR';
    const searchTerm = 'collectivités';
    
    console.log(`Testing document: ${documentName}`);
    console.log(`Search term: ${searchTerm}`);
    
    const result = await searchService.generateDocumentPreview(documentName, searchTerm);
    
    if (result) {
      console.log('\n=== Résultat ===');
      console.log('Filename:', result.documentInfo.filename);
      console.log('Physical Path:', result.documentInfo.physicalPath);
      console.log('Preview Type:', result.documentInfo.previewType);
      console.log('Total Pages:', result.documentInfo.totalPages);
      console.log('Match Count:', result.searchInfo.matchCount);
      
      // Vérifier si le chemin contient le path.real d'Elasticsearch
      const isElasticsearchPath = result.documentInfo.physicalPath.includes('/home/tims/Documents/');
      
      console.log('\n=== Validation ===');
      console.log('Uses Elasticsearch path.real:', isElasticsearchPath ? '✅ YES' : '❌ NO');
      console.log('File exists:', require('fs').existsSync(result.documentInfo.physicalPath) ? '✅ YES' : '❌ NO');
      
      if (isElasticsearchPath) {
        console.log('\n🎉 SUCCESS: generateDocumentPreview utilise correctement le path.real d\'Elasticsearch!');
      }
      
    } else {
      console.log('❌ No preview generated');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGenerateDocumentPreview().then(() => {
  console.log('\n=== Test completed ===');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
