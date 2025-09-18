const prisma = require('../lib/prisma');

(async () => {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set');
    }
    
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    // Hide sensitive parts of the URL for logging
    const safeUrl = url.split('@').pop() || 'localhost';
    console.log('[DB] OK:', safeUrl);
    
    process.exit(0);
  } catch (e) {
    console.error('[DB] ERROR:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
