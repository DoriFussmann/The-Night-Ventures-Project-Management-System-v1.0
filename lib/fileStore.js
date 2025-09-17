const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { randomUUID } = require('crypto');
const { filePath, ensureContentDir } = require('./collections');

/**
 * Ensure a collection file exists with empty array
 * @param {string} fp - File path
 */
async function ensureCollectionFile(fp) {
  try {
    await fsp.access(fp);
  } catch (_) {
    await ensureContentDir();
    await fsp.writeFile(fp, '[]', 'utf8');
  }
}

/**
 * Read JSON file safely
 * @param {string} fp - File path
 * @returns {Promise<any>} Parsed JSON data
 */
async function readJSON(fp) {
  try {
    const text = await fsp.readFile(fp, 'utf8');
    return JSON.parse(text);
  } catch (e) {
    console.warn('[fileStore] Failed to read JSON:', fp, e.message);
    return [];
  }
}

/**
 * Write JSON file atomically
 * @param {string} fp - File path
 * @param {any} data - Data to write
 */
async function writeJSON(fp, data) {
  const tmp = `${fp}.tmp-${Date.now()}`;
  try {
    const resolvedTarget = path.resolve(fp);
    const resolvedTmp = path.resolve(tmp);
    console.log('[CONTENT WRITE] target=', resolvedTarget, ' tmp=', resolvedTmp);
  } catch (_) {}
  
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fsp.rename(tmp, fp);
}

/**
 * Generate ISO timestamp
 * @returns {string} ISO timestamp
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Generate random ID
 * @returns {string} Random UUID or fallback ID
 */
function randomId() {
  try {
    return randomUUID();
  } catch (_) {
    return 'id_' + Math.random().toString(36).slice(2, 10);
  }
}

/**
 * Get all items from a collection
 * @param {string} collection - Collection name
 * @returns {Promise<any[]>} Array of items
 */
async function getAll(collection) {
  const fp = filePath(collection);
  await ensureCollectionFile(fp);
  const list = await readJSON(fp);
  return Array.isArray(list) ? list : [];
}

/**
 * Create a new item in a collection
 * @param {string} collection - Collection name
 * @param {any} partial - Partial item data
 * @returns {Promise<any>} Created item with id and timestamps
 */
async function create(collection, partial = {}) {
  const list = await getAll(collection);
  const now = nowISO();
  
  const item = {
    ...partial,
    id: partial.id || randomId(),
    createdAt: now,
    updatedAt: now
  };
  
  list.push(item);
  await writeJSON(filePath(collection), list);
  return item;
}

/**
 * Update an item in a collection
 * @param {string} collection - Collection name
 * @param {string} id - Item ID
 * @param {any} patch - Partial update data
 * @returns {Promise<any>} Updated item
 */
async function update(collection, id, patch = {}) {
  const list = await getAll(collection);
  const index = list.findIndex(item => item.id === id);
  
  if (index === -1) {
    const error = new Error('Item not found');
    error.status = 404;
    throw error;
  }
  
  const updated = {
    ...list[index],
    ...patch,
    id, // Preserve ID
    updatedAt: nowISO()
  };
  
  list[index] = updated;
  await writeJSON(filePath(collection), list);
  return updated;
}

/**
 * Remove an item from a collection
 * @param {string} collection - Collection name
 * @param {string} id - Item ID
 * @returns {Promise<object>} Success response
 */
async function remove(collection, id) {
  const list = await getAll(collection);
  const index = list.findIndex(item => item.id === id);
  
  if (index === -1) {
    const error = new Error('Item not found');
    error.status = 404;
    throw error;
  }
  
  list.splice(index, 1);
  await writeJSON(filePath(collection), list);
  return { ok: true, id };
}

module.exports = {
  getAll,
  create,
  update,
  remove,
  ensureCollectionFile,
  readJSON,
  writeJSON
};
