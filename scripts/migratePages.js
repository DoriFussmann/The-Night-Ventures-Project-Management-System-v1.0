const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migratePages() {
  try {
    console.log('Starting pages migration...');
    
    // Read pages from JSON file
    const pagesPath = path.join(__dirname, '../content/pages.json');
    const pagesJson = JSON.parse(fs.readFileSync(pagesPath, 'utf8'));
    
    console.log(`Found ${pagesJson.length} pages in JSON file`);
    
    // Migrate each page
    for (const page of pagesJson) {
      const result = await prisma.page.upsert({
        where: { slug: page.slug },
        create: {
          slug: page.slug,
          label: page.label
        },
        update: {
          label: page.label
        }
      });
      console.log(`Migrated page: ${result.slug} -> ${result.label}`);
    }
    
    console.log('Pages migration completed successfully!');
  } catch (error) {
    console.error('Error migrating pages:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migratePages();
