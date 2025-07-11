require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const migrations = [
  // Extensions first
  '20240217000000-add-uuid-extension.js',
  
  // Base tables in correct order
  '20240101-create-structure.js',
  '20231010-update-structure.js',
  '20240102-create-user.js',
  '20240103-create-role.js', // Already includes permissions column
  '20240104-create-permission.js',
  '20240105-create-etape.js',
  '20240106-create-typeprojet.js',
  '20231010-update-typeprojet.js',  '20240107-create-document.js',
  '20231010_rename_label_to_title.js', // Rename label to Title right after document creation
  '20231210000000-add-title-to-documents.js', // Add title to documents
  '20240108-create-commentaire.js',
  '20240109-create-signature.js',
  '20241230144642-create-files.js',
  
  // Junction tables and relations
  '20240110-create-user-roles.js',
  '20231213000000-create-type-projet.js',
  '20240112-drop-and-recreate-users-structure-fkey.js',
    // Document and file modifications
  // Skip 20240113-add-status-to-document.js because status is already in create-document
  '20240620000000-add-document-transfer-fields.js',
  '20241227121226-modify-status-in-documents.js',
  
  // User table enhancements (reordered)
  '20240218000000-add-roleId-to-etapes.js',
  '20240618120000-add-reset-token-to-user.js',
  '20240625000000-add-etapeId-to-documents.js',
  '20240628000000-add-sequenceNumber-to-etapes.js',
  '20241216104859-add-last-login-to-users.js',
  '20241216110432-add-is-active-to-users.js', // Moved before superadmin
  
  // Super admin creation
  'superadminMigration.js',
  
  // Password validation after superadmin creation
  '20241209160702-update-user-password-validation.js',
  
  // Remaining migrations
  '20241223112233-add-documentId-to-commentaire.js',
  '20241227124318-remove-url-from-documents.js',
  '20241230145033-add-content-to-documents.js',
  
  // Latest updates
  '20250207173509-update-user-roles-add-id.js',
  '20250212090712-update-document-commentaire-relations.js',
  '20250212092227-update-type-projet-columns.js',
  '20250212094343-create-user-roles.js',
  '20250217112937-add-timestamps-to-etape-type-projet.js',
  '20250219131951-add-permissions-to-roles.js',
  '20250221084039-add-url-to-documents.js',
  '20250224000000-add-userdestinatorname-to-documents.js',
  '20250224083457-remove-content-from-documents.js',
  // Notifications
  '20250408053114-create-notifications.js',
  '20250612000000-add-type-to-notifications.js',
  //'20250612115032-add-type-column-to-notifications.js',

  // Latest fixes (June 2025)
  '20250618122000-change-etape-description-to-text.js',
  '20250627_alter_documents_title_to_text.js',
  '20250627_alter_documents_url_to_text.js',
];

async function dropAllTables() {
  try {
    console.log('Dropping all tables...');
    const dropTablesSQL = `
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `;
    
    const command = `set PGPASSWORD=${process.env.DB_PASSWORD}&& psql -U ${process.env.DB_USERNAME} -d ${process.env.DB_NAME} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -c "${dropTablesSQL}"`;
    await execPromise(command);
    console.log('Database schema reset successfully');
  } catch (error) {
    console.error('Error resetting database:', error.message);
    throw error;
  }
}

async function runMigration(migration) {
  try {
    console.log(`Running migration: ${migration}`);
    const command = `npx sequelize-cli db:migrate --name ${migration} --migrations-path migrations --config config/config.js`;
    await execPromise(command);
    console.log(`Successfully ran migration: ${migration}`);
    return true;
  } catch (error) {
    // Check if it's a "migration not pending" error which we can safely ignore
    if (error.message.includes('Migration is not pending')) {
      console.log(`Migration ${migration} is already applied, skipping`);
      return true;
    } else {
      console.error(`Error running migration ${migration}:`, error.message);
      return false;
    }
  }
}

async function runMigrations() {
  try {
    // Reset database schema
    await dropAllTables();

    // Run migrations one by one in order
    console.log('Running migrations in order...');
    let failedMigrations = [];
    
    for (const migration of migrations) {
      const success = await runMigration(migration);
      if (!success) {
        failedMigrations.push(migration);
      }
    }
    
    if (failedMigrations.length === 0) {
      console.log('All migrations completed successfully');
    } else {
      console.warn(`Migrations completed with ${failedMigrations.length} failures:`);
      failedMigrations.forEach(migration => console.warn(`- ${migration}`));
    }
  } catch (error) {
    console.error('Migration process failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
