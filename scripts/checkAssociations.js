const { sequelize } = require('../models');

async function checkAssociations() {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        d."idDocument", 
        COUNT(f."idFile") as "fileCount", 
        COUNT(c."idComment") as "commentCount" 
      FROM "Documents" d 
      LEFT JOIN "Files" f ON f."documentId" = d."idDocument" 
      LEFT JOIN "Commentaires" c ON c."documentId" = d."idDocument" 
      GROUP BY d."idDocument" 
      LIMIT 10
    `);
    
    console.log('Document associations check:');
    console.table(results);
  } catch (error) {
    console.error('Error checking associations:', error);
  } finally {
    await sequelize.close();
  }
}

checkAssociations();
