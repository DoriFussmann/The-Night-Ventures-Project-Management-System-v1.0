const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const cors = require('cors');
const { randomUUID: nodeRandomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 5175;
const DATA_PATH = path.join(__dirname, 'data.json');
const CONTENT_DIR = path.join(__dirname, 'content');

// Collections allowed for generic content API
const ALLOWED_COLLECTIONS = ['categories', 'items', 'projects', 'advisors'];

function assertAllowedCollection(c) {
  if (!ALLOWED_COLLECTIONS.includes(c)) {
    const err = new Error(`Invalid collection: ${c}`);
    err.status = 404;
    throw err;
  }
}
function contentFilePath(c) { return path.join(CONTENT_DIR, `${c}.json`); }
async function ensureContentFile(fp) {
  try {
    await fsp.access(fp);
  } catch (_) {
    await fsp.mkdir(path.dirname(fp), { recursive: true });
    await fsp.writeFile(fp, '[]', 'utf8');
  }
}
async function readJSON(fp) {
  const text = await fsp.readFile(fp, 'utf8');
  return JSON.parse(text);
}
async function writeJSON(fp, data) {
  const tmp = `${fp}.tmp-${Date.now()}`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fsp.rename(tmp, fp);
}
function nowISO() { return new Date().toISOString(); }
function slugify(s) { return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function randomId() { try { return nodeRandomUUID(); } catch (_) { return 'id_' + Math.random().toString(36).slice(2, 10); } }

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Root can show simple status
app.get('/', (_req, res) => {
  res.type('text/plain').send('API server is running');
});

// --- Legacy data.json helpers (kept for one-time migration only) ---
function ensureLegacyDataFile() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ projects: {} }, null, 2));
  }
}
function readLegacyAll() {
  ensureLegacyDataFile();
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { projects: {} };
  }
}

// --- Migration: data.json (map) -> content/projects.json (list) ---
async function migrateLegacyProjectsIfNeeded() {
  try {
    const target = contentFilePath('projects');
    await ensureContentFile(target);
    const existingList = await readJSON(target);
    if (Array.isArray(existingList) && existingList.length > 0) return; // already migrated/has data

    if (fs.existsSync(DATA_PATH)) {
      const legacy = readLegacyAll();
      const map = legacy.projects || {};
      const now = nowISO();
      const list = Object.keys(map).map((id) => {
        const p = map[id] || {};
        const name = p.name || 'Untitled';
        return Object.assign({}, p, {
          id,
          name,
          slug: slugify(name),
          createdAt: now,
          updatedAt: now,
        });
      });
      await writeJSON(target, list);
      console.log(`[migration] Migrated ${list.length} projects from data.json to content/projects.json`);
    }
  } catch (e) {
    console.warn('[migration] skipped or failed:', e && e.message ? e.message : e);
  }
}

// --- Content store helpers ---
async function getAll(c) {
  assertAllowedCollection(c);
  const fp = contentFilePath(c);
  await ensureContentFile(fp);
  const list = await readJSON(fp);
  return Array.isArray(list) ? list : [];
}
async function saveAll(c, list) {
  assertAllowedCollection(c);
  await writeJSON(contentFilePath(c), list);
}
async function createItem(c, data) {
  const list = await getAll(c);
  const now = nowISO();
  const item = Object.assign({}, data || {}, {
    id: data && data.id ? data.id : randomId(),
    name: (data && data.name) || 'Untitled',
    slug: (data && data.slug) || slugify((data && data.name) || 'untitled'),
    createdAt: now,
    updatedAt: now,
  });
  list.push(item);
  await saveAll(c, list);
  return item;
}
async function updateItem(c, id, patch) {
  const list = await getAll(c);
  const i = list.findIndex((x) => x.id === id);
  if (i === -1) throw Object.assign(new Error('Not found'), { status: 404 });
  const prev = list[i];
  const updated = Object.assign({}, prev, patch || {}, { id, updatedAt: nowISO() });
  list[i] = updated;
  await saveAll(c, list);
  return updated;
}
async function removeItem(c, id) {
  const list = await getAll(c);
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) throw Object.assign(new Error('Not found'), { status: 404 });
  list.splice(idx, 1);
  await saveAll(c, list);
  return { ok: true, deletedId: id };
}

// --- Legacy compatibility endpoints (operate on content/projects.json) ---
app.get('/api/projects', async (_req, res) => {
  try {
    const list = await getAll('projects');
    // Return as map to match existing frontend expectations
    const map = {};
    for (const item of list) map[item.id] = item;
    res.json(map);
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { id: maybeId, project } = req.body || {};
    if (!project) return res.status(400).json({ error: 'Missing project' });
    const created = await createItem('projects', Object.assign({}, project, { id: maybeId }));
    res.status(201).json({ id: created.id });
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { project } = req.body || {};
    if (!project) return res.status(400).json({ error: 'Missing project' });
    await updateItem('projects', id, project);
    res.json({ ok: true });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await removeItem('projects', id);
    res.json({ ok: true });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

// --- Generic content API ---
app.get('/api/:collection', async (req, res) => {
  try {
    const c = req.params.collection;
    assertAllowedCollection(c);
    const list = await getAll(c);
    res.json(list);
  } catch (e) {
    const status = e && e.status ? e.status : (e && /Invalid collection/.test(String(e.message)) ? 404 : 500);
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.post('/api/:collection', async (req, res) => {
  try {
    const c = req.params.collection;
    assertAllowedCollection(c);
    const body = req.body || {};
    if (!body || !body.name) return res.status(400).json({ error: '`name` required' });
    const created = await createItem(c, body);
    res.status(201).json(created);
  } catch (e) {
    const status = e && e.status ? e.status : (e && /Invalid collection/.test(String(e.message)) ? 404 : 500);
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.get('/api/:collection/:id', async (req, res) => {
  try {
    const c = req.params.collection;
    const id = req.params.id;
    assertAllowedCollection(c);
    const list = await getAll(c);
    const item = list.find((x) => x.id === id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    const status = e && e.status ? e.status : (e && /Invalid collection/.test(String(e.message)) ? 404 : 500);
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.put('/api/:collection/:id', async (req, res) => {
  try {
    const c = req.params.collection;
    const id = req.params.id;
    assertAllowedCollection(c);
    const patch = req.body || {};
    const updated = await updateItem(c, id, patch);
    res.json(updated);
  } catch (e) {
    const status = e && e.status ? e.status : (e && /Invalid collection/.test(String(e.message)) ? 404 : 500);
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const c = req.params.collection;
    const id = req.params.id;
    assertAllowedCollection(c);
    const out = await removeItem(c, id);
    res.json(out);
  } catch (e) {
    const status = e && e.status ? e.status : (e && /Invalid collection/.test(String(e.message)) ? 404 : 500);
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

// Startup: migrate legacy data once, then listen
(async () => {
  await migrateLegacyProjectsIfNeeded();
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
})();


