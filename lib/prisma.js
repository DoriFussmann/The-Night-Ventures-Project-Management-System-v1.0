const { PrismaClient } = require('@prisma/client');

// Singleton pattern to avoid multiple Prisma client instances
// Especially important in development with hot reload
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ 
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [] 
  });
} else {
  // In development, use a global variable to preserve the client across hot reloads
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
