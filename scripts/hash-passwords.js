const bcrypt = require('bcrypt');
const fs = require('fs').promises;
const path = require('path');

async function hashPasswords() {
  try {
    console.log('🔐 Hashing passwords in users.json...');
    
    // Read current users
    const usersPath = path.join(__dirname, '../content/users.json');
    const usersData = await fs.readFile(usersPath, 'utf8');
    const users = JSON.parse(usersData);
    
    console.log(`Found ${users.length} users to process`);
    
    // Hash passwords for each user
    const saltRounds = 10;
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (user.password && !user.password.startsWith('$2b$')) {
        // Only hash if password is not already hashed
        console.log(`Hashing password for: ${user.email}`);
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        users[i].password = hashedPassword;
      } else {
        console.log(`Skipping ${user.email} - already hashed or no password`);
      }
    }
    
    // Write back to file
    await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
    console.log('✅ All passwords hashed successfully!');
    console.log('📁 Updated users.json with secure password hashes');
    
  } catch (error) {
    console.error('❌ Error hashing passwords:', error);
  }
}

hashPasswords();
