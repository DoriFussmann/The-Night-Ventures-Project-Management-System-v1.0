const fs = require('fs').promises;
const path = require('path');

// Helper function to normalize page access (same as server.js)
function normalizePageAccess(pageList, incomingAccess = {}) {
  const normalized = {};
  
  // Set all pages to false by default
  pageList.forEach(page => {
    normalized[page.slug] = false;
  });
  
  // Apply incoming access for matching slugs only
  Object.keys(incomingAccess).forEach(slug => {
    if (pageList.some(page => page.slug === slug)) {
      normalized[slug] = Boolean(incomingAccess[slug]);
    }
  });
  
  return normalized;
}

async function normalizeAllUsers() {
  try {
    console.log('🔄 Normalizing page access for all users...');
    
    // Read pages registry
    const pagesPath = path.join(__dirname, '../content/pages.json');
    const pagesData = await fs.readFile(pagesPath, 'utf8');
    const pages = JSON.parse(pagesData);
    console.log(`📋 Found ${pages.length} pages in registry:`, pages.map(p => p.slug).join(', '));
    
    // Read users
    const usersPath = path.join(__dirname, '../content/users.json');
    const usersData = await fs.readFile(usersPath, 'utf8');
    const users = JSON.parse(usersData);
    console.log(`👥 Found ${users.length} users to normalize`);
    
    let normalizedCount = 0;
    let unchangedCount = 0;
    
    // Normalize each user's pageAccess
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const originalAccess = user.pageAccess || {};
      const normalizedAccess = normalizePageAccess(pages, originalAccess);
      
      // Check if normalization changed anything
      const accessChanged = JSON.stringify(originalAccess) !== JSON.stringify(normalizedAccess);
      
      if (accessChanged) {
        console.log(`🔧 Normalizing ${user.email}:`);
        console.log(`   Before: ${JSON.stringify(originalAccess)}`);
        console.log(`   After:  ${JSON.stringify(normalizedAccess)}`);
        users[i].pageAccess = normalizedAccess;
        users[i].updatedAt = new Date().toISOString();
        normalizedCount++;
      } else {
        console.log(`✅ ${user.email} already normalized`);
        unchangedCount++;
      }
    }
    
    if (normalizedCount > 0) {
      // Write back to file
      await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
      console.log(`✅ Normalized ${normalizedCount} users, ${unchangedCount} unchanged`);
      console.log('📁 Updated users.json with normalized page access');
    } else {
      console.log('✅ All users already have normalized page access');
    }
    
    // Show final summary
    console.log('\n📊 Final page access summary:');
    const accessSummary = {};
    pages.forEach(page => {
      accessSummary[page.slug] = users.filter(u => u.pageAccess && u.pageAccess[page.slug]).length;
    });
    
    Object.entries(accessSummary).forEach(([slug, count]) => {
      console.log(`   ${slug}: ${count}/${users.length} users have access`);
    });
    
  } catch (error) {
    console.error('❌ Error normalizing page access:', error);
    process.exit(1);
  }
}

normalizeAllUsers();
