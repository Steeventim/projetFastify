const { sequelize } = require('../models');

async function addTypeColumnToNotifications() {
  try {
    console.log('🔧 Adding type column to Notifications table...');
    
    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Notifications' 
      AND column_name = 'type'
    `);
    
    if (results.length === 0) {
      // Column doesn't exist, add it
      await sequelize.query(`
        ALTER TABLE "Notifications" 
        ADD COLUMN "type" VARCHAR(255)
      `);
      console.log('✅ Type column added successfully to Notifications table');
    } else {
      console.log('✅ Type column already exists in Notifications table');
    }

    // Update migration status
    await sequelize.query(`
      INSERT INTO "SequelizeMeta" (name) 
      VALUES ('20250612000000-add-type-to-notifications.js')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Migration status updated');

    console.log('🎉 Notifications table fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing notifications table:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

addTypeColumnToNotifications();
