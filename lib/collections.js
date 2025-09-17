const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');

/**
 * Get all available collections by scanning /content/*.json files
 * @returns {Promise<string[]>} Array of collection names
 */
async function getCollections() {
  try {
    await ensureContentDir();
    const files = await fsp.readdir(CONTENT_DIR);
    return files
      .filter(f => f.endsWith('.json') && !f.includes('.tmp-'))
      .map(f => f.replace('.json', ''))
      .sort();
  } catch (e) {
    console.warn('[collections] Failed to read content dir:', e.message);
    return [];
  }
}

/**
 * Get absolute file path for a collection
 * @param {string} collection - Collection name
 * @returns {string} Absolute path to collection JSON file
 */
function filePath(collection) {
  return path.join(CONTENT_DIR, `${collection}.json`);
}

/**
 * Get content directory path
 * @returns {string} Absolute path to content directory
 */
function getContentDir() {
  return CONTENT_DIR;
}

/**
 * Ensure content directory exists
 */
async function ensureContentDir() {
  try {
    await fsp.access(CONTENT_DIR);
  } catch (_) {
    await fsp.mkdir(CONTENT_DIR, { recursive: true });
  }
}

/**
 * Get collection metadata (size, mtime, exists)
 * @param {string} collection - Collection name
 * @returns {Promise<object>} Metadata object
 */
async function getCollectionMeta(collection) {
  const fp = filePath(collection);
  try {
    const stats = await fsp.stat(fp);
    return {
      name: collection,
      path: fp,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      exists: true
    };
  } catch (_) {
    return {
      name: collection,
      path: fp,
      size: 0,
      mtime: null,
      exists: false
    };
  }
}

module.exports = {
  getCollections,
  filePath,
  getContentDir,
  ensureContentDir,
  getCollectionMeta
};
