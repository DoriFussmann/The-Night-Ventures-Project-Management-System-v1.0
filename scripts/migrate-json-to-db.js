const fs = require('fs');
const path = require('path');
const { initSchema, createOne, seedInitialData } = require('../lib/store-db');

async function migrateJsonToDb() {
  try {
    console.log('[MIGRATE] Initializing database schema (collections, auth, permissions)...');
    await initSchema();
    
    console.log('[MIGRATE] Seeding initial data...');
    await seedInitialData();
    
    const contentDir = path.join(__dirname, '..', 'content');
    
    if (!fs.existsSync(contentDir)) {
      console.log('[MIGRATE] No content directory found, nothing to migrate');
      return;
    }
    
    const files = fs.readdirSync(contentDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('.tmp-'));
    
    console.log(`[MIGRATE] Found ${jsonFiles.length} JSON files to migrate:`, jsonFiles);
    
    for (const file of jsonFiles) {
      const collection = path.basename(file, '.json');
      const filePath = path.join(contentDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) {
          console.warn(`[MIGRATE] Skipping ${file}: not an array`);
          continue;
        }
        
        console.log(`[MIGRATE] Migrating ${data.length} items from ${collection}...`);
        
        for (const item of data) {
          try {
            await createOne(collection, item);
          } catch (e) {
            console.warn(`[MIGRATE] Failed to migrate item in ${collection}:`, e.message);
          }
        }
        
        console.log(`[MIGRATE] ✅ Successfully migrated ${collection}`);
        
      } catch (e) {
        console.error(`[MIGRATE] Failed to process ${file}:`, e.message);
      }
    }
    
    console.log('[MIGRATE] Migration completed!');
    
  } catch (e) {
    console.error('[MIGRATE] Migration failed:', e);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateJsonToDb().then(() => {
    console.log('[MIGRATE] Done');
    process.exit(0);
  }).catch(e => {
    console.error('[MIGRATE] Error:', e);
    process.exit(1);
  });
}

module.exports = { migrateJsonToDb };
