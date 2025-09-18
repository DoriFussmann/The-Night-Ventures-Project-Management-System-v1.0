const fs = require('fs').promises;
const path = require('path');
const prisma = require('../lib/prisma');

async function importFromJson() {
  // Check for DATABASE_URL before doing anything
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set. Skipping import.');
    process.exit(1);
  }

  try {
    console.log('🔄 Importing data from JSON files to PostgreSQL...');
    
    // Read users from JSON
    const usersPath = path.join(__dirname, '../content/users.json');
    const usersData = await fs.readFile(usersPath, 'utf8');
    const users = JSON.parse(usersData);
    console.log(`👥 Found ${users.length} users to import`);
    
    // Read projects from JSON
    const projectsPath = path.join(__dirname, '../content/projects.json');
    const projectsData = await fs.readFile(projectsPath, 'utf8');
    const projects = JSON.parse(projectsData);
    console.log(`📋 Found ${projects.length} projects to import`);
    
    let usersImported = 0;
    let usersSkipped = 0;
    
    // Import users
    for (const user of users) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingUser) {
          console.log(`⏭️  Skipping existing user: ${user.email}`);
          usersSkipped++;
          continue;
        }
        
        // Ensure password is properly hashed (don't re-hash if already bcrypt)
        let password = user.password;
        if (password && !password.startsWith('$2b$')) {
          console.log(`⚠️  User ${user.email} has plaintext password - this should have been fixed!`);
          // Don't import users with plaintext passwords
          continue;
        }
        
        // Import user with preserved ID
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            password: password,
            isSuperadmin: user.isSuperadmin || false,
            pageAccess: user.pageAccess || {},
            project: user.project || null,
            projectName: user.projectName || null,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
          }
        });
        
        console.log(`✅ Imported user: ${user.email}`);
        usersImported++;
      } catch (error) {
        console.error(`❌ Failed to import user ${user.email}:`, error.message);
      }
    }
    
    let projectsImported = 0;
    let projectsSkipped = 0;
    
    // Import projects
    for (const project of projects) {
      try {
        // Check if project already exists
        const existingProject = await prisma.project.findUnique({
          where: { id: project.id }
        });
        
        if (existingProject) {
          console.log(`⏭️  Skipping existing project: ${project.name}`);
          projectsSkipped++;
          continue;
        }
        
        // Import project with preserved ID
        await prisma.project.create({
          data: {
            id: project.id,
            title: project.name || 'Untitled Project',
            status: project.status || null,
            notes: JSON.stringify({
              description: project.description || '',
              individuals: project.individuals || [],
              source: project.source || '',
              type: project.type || '',
              monthlyImpact: project.monthlyImpact || 0,
              hoursPerMonth: project.hoursPerMonth || 0,
              tasks: project.tasks || {},
              imageDataUrl: project.imageDataUrl || null
            }),
            createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
            updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date()
          }
        });
        
        console.log(`✅ Imported project: ${project.name}`);
        projectsImported++;
      } catch (error) {
        console.error(`❌ Failed to import project ${project.name}:`, error.message);
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`👥 Users: ${usersImported} upserted, ${usersSkipped} skipped`);
    console.log(`📋 Projects: ${projectsImported} upserted, ${projectsSkipped} skipped`);
    
    // Verify final counts
    const totalUsers = await prisma.user.count();
    const totalProjects = await prisma.project.count();
    console.log(`\n🔍 Database verification:`);
    console.log(`👥 Total users in database: ${totalUsers}`);
    console.log(`📋 Total projects in database: ${totalProjects}`);
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    if (error.message.includes('connect') || error.message.includes('timeout')) {
      console.error('💡 Check your DATABASE_URL and ensure the database is accessible');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importFromJson();
