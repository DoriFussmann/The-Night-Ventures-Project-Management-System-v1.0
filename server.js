const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5175;
const DATA_PATH = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Root can show simple status
app.get('/', (_req, res) => {
  res.type('text/plain').send('API server is running');
});

function ensureDataFile() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ projects: {} }, null, 2));
  }
}

function readAll() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { projects: {} };
  }
}

function writeAll(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function generateId() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

// API
app.get('/api/projects', (req, res) => {
  const data = readAll();
  res.json(data.projects || {});
});

app.post('/api/projects', (req, res) => {
  const { id: maybeId, project } = req.body || {};
  if (!project) return res.status(400).json({ error: 'Missing project' });
  const data = readAll();
  const id = maybeId || generateId();
  data.projects[id] = project;
  writeAll(data);
  res.status(201).json({ id });
});

app.put('/api/projects/:id', (req, res) => {
  const id = req.params.id;
  const { project } = req.body || {};
  if (!project) return res.status(400).json({ error: 'Missing project' });
  const data = readAll();
  if (!data.projects[id]) return res.status(404).json({ error: 'Not found' });
  data.projects[id] = project;
  writeAll(data);
  res.json({ ok: true });
});

app.delete('/api/projects/:id', (req, res) => {
  const id = req.params.id;
  const data = readAll();
  if (!data.projects[id]) return res.status(404).json({ error: 'Not found' });
  delete data.projects[id];
  writeAll(data);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});


