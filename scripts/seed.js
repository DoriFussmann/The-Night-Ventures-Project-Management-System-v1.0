const bcrypt = require('bcrypt');
const { sql } = require('../lib/db');

async function seedData() {
  try {
    console.log('[SEED] Starting database seeding...');
    
    // Check if POSTGRES_URL is available
    if (!process.env.POSTGRES_URL) {
      console.error('[SEED] POSTGRES_URL environment variable is required');
      process.exit(1);
    }

    let userCount = 0;
    let pageCount = 0;
    let projectCount = 0;
    let membershipCount = 0;

    // 1. Upsert admin user
    const passwordHash = await bcrypt.hash('changeme', 10);
    
    const userResult = await sql`
      INSERT INTO users (email, password_hash, name, is_admin)
      VALUES ('admin@site.test', ${passwordHash}, 'Admin User', true)
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        is_admin = EXCLUDED.is_admin
      RETURNING id
    `;
    
    const adminUserId = userResult.rows[0].id;
    userCount = 1;

    // 2. Upsert pages
    const pages = [
      { slug: 'hub', title: 'Hub', is_universal: true, is_hidden: false },
      { slug: 'bva-dashboard', title: 'BvA Dashboard', is_universal: true, is_hidden: false }
    ];

    for (const page of pages) {
      await sql`
        INSERT INTO pages (slug, title, is_universal, is_hidden)
        VALUES (${page.slug}, ${page.title}, ${page.is_universal}, ${page.is_hidden})
        ON CONFLICT (slug)
        DO UPDATE SET
          title = EXCLUDED.title,
          is_universal = EXCLUDED.is_universal,
          is_hidden = EXCLUDED.is_hidden
      `;
      pageCount++;
    }

    // 3. Upsert demo project
    const projectResult = await sql`
      INSERT INTO projects (name, slug)
      VALUES ('Demo Project', 'demo')
      ON CONFLICT (slug)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    
    const demoProjectId = projectResult.rows[0].id;
    projectCount = 1;

    // 4. Add admin to demo project
    await sql`
      INSERT INTO user_projects (user_id, project_id, role)
      VALUES (${adminUserId}, ${demoProjectId}, 'admin')
      ON CONFLICT (user_id, project_id)
      DO UPDATE SET role = EXCLUDED.role
    `;
    membershipCount = 1;

    console.log(`[SEED] ✅ Seeding completed successfully:`);
    console.log(`[SEED]   - Users: ${userCount}`);
    console.log(`[SEED]   - Pages: ${pageCount}`);
    console.log(`[SEED]   - Projects: ${projectCount}`);
    console.log(`[SEED]   - Memberships: ${membershipCount}`);

  } catch (error) {
    console.error('[SEED] ❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedData().then(() => {
    console.log('[SEED] Done');
    process.exit(0);
  }).catch(error => {
    console.error('[SEED] Error:', error.message);
    process.exit(1);
  });
}

module.exports = { seedData };
