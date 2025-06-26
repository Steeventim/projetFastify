// Test d'extraction du path.real avec les données Elasticsearch réelles
const testData = {
  "_source": {
    "path": {
      "real": "/home/tims/Documents/Others/L1_output.pdf",
      "virtual": "/L1_output.pdf",
      "root": "315191b16b952724d42575b3a86bf4"
    },
    "file": {
      "filename": "L1_output.pdf"
    }
  }
};

// Fonction d'extraction comme dans notre code
function extractPhysicalPath(elasticsearchDoc) {
  return elasticsearchDoc.path?.real || 
         elasticsearchDoc.file?.path?.real || 
         elasticsearchDoc.file?.path || 
         'Document non trouvé localement';
}

console.log('=== Test d\'extraction du path.real ===');
console.log('Données test:', JSON.stringify(testData._source, null, 2));
const physicalPath = extractPhysicalPath(testData._source);
console.log('Path extrait:', physicalPath);

// Vérifier si le fichier existe
const fs = require('fs');
if (fs.existsSync(physicalPath)) {
  console.log('✅ SUCCESS: Le fichier existe au chemin extrait!');
  console.log('✅ L\'extraction du path.real fonctionne correctement');
} else {
  console.log('❌ Le fichier n\'existe pas au chemin:', physicalPath);
}

console.log('\n=== Résumé ===');
console.log('Méthode d\'extraction:', 'elasticsearchDoc.path?.real');
console.log('Chemin physique:', physicalPath);
console.log('Fichier accessible:', fs.existsSync(physicalPath) ? 'OUI' : 'NON');
