#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CONTENT_FILE = path.join(__dirname, 'content-data.json');

class ContentManager {
  constructor() {
    this.ensureContentFile();
  }

  ensureContentFile() {
    if (!fs.existsSync(CONTENT_FILE)) {
      const defaultContent = {
        projects: {},
        version: "1.0.0",
        lastExported: null
      };
      fs.writeFileSync(CONTENT_FILE, JSON.stringify(defaultContent, null, 2));
      console.log('✓ Created content-data.json');
    }
  }

  exportFromBrowser() {
    console.log('\n📤 EXPORT INSTRUCTIONS:');
    console.log('1. Open your app in the browser');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Console tab');
    console.log('4. Run this command:');
    console.log('\n   copy(JSON.stringify({projects: JSON.parse(localStorage.getItem("tnv_projects_v1") || "{}"), version: "1.0.0", lastExported: new Date().toISOString()}, null, 2))');
    console.log('\n5. Paste the copied content into content-data.json');
    console.log('6. Commit and push to Git\n');
    
    // Also provide a simpler browser script
    const exportScript = `
// Copy this entire block and run it in your browser console:
(function() {
  const data = {
    projects: JSON.parse(localStorage.getItem('tnv_projects_v1') || '{}'),
    version: '1.0.0',
    lastExported: new Date().toISOString()
  };
  const jsonString = JSON.stringify(data, null, 2);
  
  // Try to copy to clipboard
  if (navigator.clipboard) {
    navigator.clipboard.writeText(jsonString).then(() => {
      console.log('✓ Content exported to clipboard! Paste it into content-data.json');
    });
  } else {
    console.log('Content to copy to content-data.json:');
    console.log(jsonString);
  }
})();
`;
    
    fs.writeFileSync(path.join(__dirname, 'export-script.js'), exportScript.trim());
    console.log('💡 Tip: A browser script has been saved to export-script.js for easier copying');
  }

  importToBrowser() {
    try {
      const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
      
      console.log('\n📥 IMPORT INSTRUCTIONS:');
      console.log('1. Open your app in the browser');
      console.log('2. Open Developer Tools (F12)');
      console.log('3. Go to Console tab');
      console.log('4. Run this command:');
      console.log(`\n   localStorage.setItem('tnv_projects_v1', '${JSON.stringify(JSON.stringify(content.projects))}'); location.reload();`);
      console.log('\n✓ This will load your content and refresh the page\n');
      
      // Also create an import script
      const importScript = `
// Copy this entire block and run it in your browser console:
(function() {
  const projectsData = ${JSON.stringify(content.projects, null, 2)};
  localStorage.setItem('tnv_projects_v1', JSON.stringify(projectsData));
  console.log('✓ Content imported successfully!');
  console.log('Refreshing page to show your data...');
  location.reload();
})();
`;
      
      fs.writeFileSync(path.join(__dirname, 'import-script.js'), importScript.trim());
      console.log('💡 Tip: A browser script has been saved to import-script.js for easier importing');
      
      const projectCount = Object.keys(content.projects).length;
      console.log(`📊 Ready to import ${projectCount} project(s)`);
      if (content.lastExported) {
        console.log(`📅 Last exported: ${content.lastExported}`);
      }
      
    } catch (error) {
      console.error('❌ Error reading content-data.json:', error.message);
      process.exit(1);
    }
  }

  setup() {
    console.log('🚀 Setting up The Night Ventures Project Management System...\n');
    
    this.ensureContentFile();
    
    // Check if there's content to import
    try {
      const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
      const projectCount = Object.keys(content.projects).length;
      
      if (projectCount > 0) {
        console.log(`📦 Found ${projectCount} project(s) in content-data.json`);
        this.importToBrowser();
      } else {
        console.log('📝 No existing content found. You can start creating projects!');
        console.log('💡 After creating content, run "npm run content:export" to save it for other machines\n');
      }
    } catch (error) {
      console.log('⚠️  Could not read content file, starting fresh');
    }
  }

  showStatus() {
    try {
      const content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
      const projectCount = Object.keys(content.projects).length;
      
      console.log('\n📊 Content Status:');
      console.log(`   Projects: ${projectCount}`);
      console.log(`   Version: ${content.version}`);
      console.log(`   Last exported: ${content.lastExported || 'Never'}`);
      console.log(`   File: ${CONTENT_FILE}\n`);
      
      if (projectCount > 0) {
        console.log('📋 Projects:');
        Object.entries(content.projects).forEach(([id, project]) => {
          const taskCount = project.tasks ? 
            (project.tasks.todo?.length || 0) + 
            (project.tasks.doing?.length || 0) + 
            (project.tasks.done?.length || 0) : 0;
          console.log(`   • ${project.name || id} (${taskCount} tasks)`);
        });
        console.log();
      }
    } catch (error) {
      console.error('❌ Error reading content status:', error.message);
    }
  }
}

// CLI handling
const command = process.argv[2];
const manager = new ContentManager();

switch (command) {
  case 'export':
    manager.exportFromBrowser();
    break;
  case 'import':
    manager.importToBrowser();
    break;
  case 'setup':
    manager.setup();
    break;
  case 'status':
    manager.showStatus();
    break;
  default:
    console.log('The Night Ventures - Content Manager\n');
    console.log('Usage:');
    console.log('  node content-manager.js setup   # Setup content on new machine');
    console.log('  node content-manager.js export  # Get instructions to export from browser');
    console.log('  node content-manager.js import  # Get instructions to import to browser');
    console.log('  node content-manager.js status  # Show current content status');
}
