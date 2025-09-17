const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

// Check if we have a database connection
let sql;
let useMockDb = false;

try {
  const db = require('./db');
  sql = db.sql;
  // Test if POSTGRES_URL is available
  if (!process.env.POSTGRES_URL) {
    console.warn('[DB] No POSTGRES_URL found, using mock database for development');
    useMockDb = true;
  }
} catch (e) {
  console.warn('[DB] Database connection failed, using mock database:', e.message);
  useMockDb = true;
}

// Mock database for development
const mockDb = {
  collections: new Set(),
  items: new Map()
};

/**
 * Initialize database schema
 */
async function initSchema() {
  if (useMockDb) {
    console.log('[DB] Mock database initialized');
    return;
  }
  
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await sql.query(statement.trim());
      }
    }
    console.log('[DB] Schema initialized successfully');
  } catch (e) {
    console.error('[DB] Schema initialization failed:', e.message);
    throw e;
  }
}

/**
 * Ensure a collection exists in the database
 * @param {string} name - Collection name
 */
async function ensureCollection(name) {
  if (useMockDb) {
    mockDb.collections.add(name);
    return;
  }
  
  try {
    await sql`INSERT INTO collections (name) VALUES (${name}) ON CONFLICT DO NOTHING`;
  } catch (e) {
    console.warn('[DB] Failed to ensure collection:', name, e.message);
  }
}

/**
 * List all collections
 * @returns {Promise<string[]>} Array of collection names
 */
async function listCollections() {
  if (useMockDb) {
    return Array.from(mockDb.collections).sort();
  }
  
  try {
    const result = await sql`SELECT name FROM collections ORDER BY name`;
    return result.rows.map(row => row.name);
  } catch (e) {
    console.warn('[DB] Failed to list collections:', e.message);
    return [];
  }
}

/**
 * Get all items from a collection
 * @param {string} collection - Collection name
 * @returns {Promise<any[]>} Array of items
 */
async function getAll(collection) {
  await ensureCollection(collection);
  
  if (useMockDb) {
    const items = [];
    for (const [key, item] of mockDb.items) {
      if (item.collection === collection) {
        items.push({
          ...item.data,
          id: item.id,
          created_at: item.created_at,
          updated_at: item.updated_at
        });
      }
    }
    return items.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }
  
  try {
    const result = await sql`
      SELECT id, collection, data, created_at, updated_at 
      FROM items 
      WHERE collection = ${collection} 
      ORDER BY updated_at DESC
    `;
    return result.rows.map(row => ({
      ...row.data,
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (e) {
    console.warn('[DB] Failed to get all items:', collection, e.message);
    return [];
  }
}

/**
 * Get a single item by ID
 * @param {string} collection - Collection name
 * @param {string} id - Item ID
 * @returns {Promise<any|null>} Item or null if not found
 */
async function getOne(collection, id) {
  await ensureCollection(collection);
  
  if (useMockDb) {
    const key = `${collection}:${id}`;
    const item = mockDb.items.get(key);
    if (!item) return null;
    
    return {
      ...item.data,
      id: item.id,
      created_at: item.created_at,
      updated_at: item.updated_at
    };
  }
  
  try {
    const result = await sql`
      SELECT id, collection, data, created_at, updated_at 
      FROM items 
      WHERE collection = ${collection} AND id = ${id}::uuid 
      LIMIT 1
    `;
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row.data,
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (e) {
    console.warn('[DB] Failed to get item:', collection, id, e.message);
    return null;
  }
}

/**
 * Create a new item
 * @param {string} collection - Collection name
 * @param {any} payload - Item data
 * @returns {Promise<any>} Created item
 */
async function createOne(collection, payload) {
  await ensureCollection(collection);
  
  const id = payload.id && typeof payload.id === 'string' ? payload.id : randomUUID();
  const now = new Date();
  const data = { 
    ...(payload.data ?? payload), 
    id, 
    name: payload.name ?? payload.data?.name ?? 'Untitled'
  };
  
  if (useMockDb) {
    const key = `${collection}:${id}`;
    const item = {
      id,
      collection,
      data,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
    mockDb.items.set(key, item);
    
    return {
      ...data,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
  }
  
  try {
    await sql`
      INSERT INTO items (id, collection, data, created_at, updated_at)
      VALUES (${id}::uuid, ${collection}, ${JSON.stringify(data)}, ${now.toISOString()}, ${now.toISOString()})
    `;
    
    return {
      ...data,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };
  } catch (e) {
    console.error('[DB] Failed to create item:', collection, e.message);
    throw e;
  }
}

/**
 * Update an existing item
 * @param {string} collection - Collection name
 * @param {string} id - Item ID
 * @param {any} patch - Partial data to update
 * @returns {Promise<any>} Updated item
 */
async function updateOne(collection, id, patch) {
  await ensureCollection(collection);
  
  const existing = await getOne(collection, id);
  if (!existing) {
    throw new Error('Item not found');
  }
  
  const merged = { ...existing, ...patch, id };
  const now = new Date().toISOString();
  
  if (useMockDb) {
    const key = `${collection}:${id}`;
    const item = mockDb.items.get(key);
    if (item) {
      item.data = merged;
      item.updated_at = now;
      mockDb.items.set(key, item);
    }
    
    return {
      ...merged,
      updated_at: now
    };
  }
  
  try {
    await sql`
      UPDATE items 
      SET data = ${JSON.stringify(merged)}, updated_at = ${now}
      WHERE id = ${id}::uuid AND collection = ${collection}
    `;
    
    return {
      ...merged,
      updated_at: now
    };
  } catch (e) {
    console.error('[DB] Failed to update item:', collection, id, e.message);
    throw e;
  }
}

/**
 * Delete an item
 * @param {string} collection - Collection name
 * @param {string} id - Item ID
 * @returns {Promise<{ok: boolean, id: string}>} Deletion result
 */
async function deleteOne(collection, id) {
  await ensureCollection(collection);
  
  if (useMockDb) {
    const key = `${collection}:${id}`;
    mockDb.items.delete(key);
    return { ok: true, id };
  }
  
  try {
    await sql`DELETE FROM items WHERE id = ${id}::uuid AND collection = ${collection}`;
    return { ok: true, id };
  } catch (e) {
    console.error('[DB] Failed to delete item:', collection, id, e.message);
    throw e;
  }
}

/**
 * Get collection metadata for health checks
 * @param {string} collection - Collection name
 * @returns {Promise<{name: string, count: number}>} Collection metadata
 */
async function getCollectionMeta(collection) {
  if (useMockDb) {
    let count = 0;
    for (const [key, item] of mockDb.items) {
      if (item.collection === collection) count++;
    }
    return { name: collection, count };
  }
  
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE collection = ${collection}
    `;
    return {
      name: collection,
      count: parseInt(result.rows[0]?.count || '0', 10)
    };
  } catch (e) {
    console.warn('[DB] Failed to get collection meta:', collection, e.message);
    return { name: collection, count: 0 };
  }
}

/**
 * Seed initial pages data
 */
async function seedInitialData() {
  if (useMockDb) {
    console.log('[DB] Skipping seed data for mock database');
    return;
  }

  try {
    // Check if pages already exist
    const pagesResult = await sql`SELECT COUNT(*) as count FROM pages`;
    const pageCount = parseInt(pagesResult.rows[0]?.count || '0', 10);
    
    if (pageCount > 0) {
      console.log('[DB] Pages already seeded, skipping');
      return;
    }

    // Seed initial pages
    const initialPages = [
      { slug: 'bva', title: 'Budget vs Actual', is_universal: true, is_hidden: false },
      { slug: 'admin', title: 'Admin Panel', is_universal: false, is_hidden: false },
      { slug: 'home', title: 'Home', is_universal: true, is_hidden: false }
    ];

    for (const page of initialPages) {
      await sql`
        INSERT INTO pages (slug, title, is_universal, is_hidden)
        VALUES (${page.slug}, ${page.title}, ${page.is_universal}, ${page.is_hidden})
        ON CONFLICT (slug) DO NOTHING
      `;
    }

    console.log(`[DB] Seeded ${initialPages.length} initial pages`);
  } catch (e) {
    console.warn('[DB] Failed to seed initial data:', e.message);
  }
}

module.exports = {
  initSchema,
  ensureCollection,
  listCollections,
  getAll,
  getOne,
  createOne,
  updateOne,
  deleteOne,
  getCollectionMeta,
  seedInitialData
};
