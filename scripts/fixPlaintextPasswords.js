const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

async function fixPlaintextPasswords() {
  try {
    console.log('🔐 Scanning and fixing plaintext passwords in users.json...');
    
    // Read current users
    const usersPath = path.join(__dirname, '../content/users.json');
    const usersData = await fs.readFile(usersPath, 'utf8');
    const users = JSON.parse(usersData);
    
    console.log(`Found ${users.length} users to scan`);
    
    let fixedCount = 0;
    const saltRounds = 10;
    
    // Check and fix passwords for each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (user.password && !user.password.startsWith('$2b$')) {
        // Password is plaintext - hash it
        console.log(`🚨 FIXING plaintext password for: ${user.email}`);
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        users[i].password = hashedPassword;
        users[i].updatedAt = new Date().toISOString();
        fixedCount++;
      } else if (user.password && user.password.startsWith('$2b$')) {
        console.log(`✅ Password already secure for: ${user.email}`);
      } else {
        console.log(`⚠️  No password found for: ${user.email}`);
      }
    }
    
    if (fixedCount > 0) {
      // Write back to file only if changes were made
      await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
      console.log(`✅ Fixed ${fixedCount} plaintext passwords!`);
      console.log('📁 Updated users.json with secure password hashes');
    } else {
      console.log('✅ No plaintext passwords found - all secure!');
    }
    
    // Final verification scan
    console.log('\n🔍 Final verification scan:');
    const plaintextCount = users.filter(u => u.password && !u.password.startsWith('$2b$')).length;
    if (plaintextCount === 0) {
      console.log('✅ VERIFICATION PASSED: No plaintext passwords remain');
    } else {
      console.log(`❌ VERIFICATION FAILED: ${plaintextCount} plaintext passwords still exist`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error fixing plaintext passwords:', error);
    process.exit(1);
  }
}

fixPlaintextPasswords();
