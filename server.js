const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { randomUUID: nodeRandomUUID } = require('crypto');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_PATH = path.join(__dirname, 'data.json');
const CONTENT_DIR = path.join(__dirname, 'content');

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// Ensure content directory exists
async function ensureContentDir() {
  try {
    await fsp.mkdir(CONTENT_DIR, { recursive: true });
  } catch (e) {
    // Directory already exists
  }
}

// File-based storage helpers
async function readCollection(name) {
  const filePath = path.join(CONTENT_DIR, `${name}.json`);
  try {
    const data = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

async function writeCollection(name, data) {
  const filePath = path.join(CONTENT_DIR, `${name}.json`);
  const tempPath = filePath + '.tmp';
  
  await fsp.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fsp.rename(tempPath, filePath);
}

async function getCollections() {
  try {
    const files = await fsp.readdir(CONTENT_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch (e) {
    return [];
  }
}


// Legacy projects endpoint (for backward compatibility)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await readCollection('projects');
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const projects = await readCollection('projects');
    const newProject = {
      id: nodeRandomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    projects.push(newProject);
    await writeCollection('projects', projects);
    res.json(newProject);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const projects = await readCollection('projects');
    const index = projects.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    projects[index] = {
      ...projects[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    await writeCollection('projects', projects);
    res.json(projects[index]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projects = await readCollection('projects');
    const index = projects.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    projects.splice(index, 1);
    await writeCollection('projects', projects);
    res.json({ ok: true, id: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Authentication endpoints (must be before generic collection routes)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const users = await readCollection('users');
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Use bcrypt to verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set a simple session cookie (in production, use JWT or proper session management)
    res.cookie('session', JSON.stringify({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperadmin: user.isSuperadmin || false
    }), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax'
    });

    // Get project name and logo for the user
    let projectName = 'No project assigned';
    let projectLogo = null;
    if (user.project) {
      try {
        const projects = await readCollection('projects');
        const userProject = projects.find(p => p.id === user.project);
        if (userProject) {
          projectName = userProject.name;
          projectLogo = userProject.imageDataUrl || null;
          console.log(`[DEBUG LOGIN] Found project: ${projectName}, has logo: ${!!projectLogo}`);
        }
      } catch (e) {
        console.error('Error loading project for user:', e);
      }
    }

    // Return user data (without password) with project name and logo
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      projectName,
      projectLogo
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const sessionCookie = req.cookies.session;
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userData = JSON.parse(sessionCookie);
    
    // Get fresh user data from database to ensure we have latest info
    const users = await readCollection('users');
    const currentUser = users.find(u => u.id === userData.id);
    
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get project name and logo for the user
    let projectName = 'No project assigned';
    let projectLogo = null;
    if (currentUser.project) {
      try {
        const projects = await readCollection('projects');
        const userProject = projects.find(p => p.id === currentUser.project);
        if (userProject) {
          projectName = userProject.name;
          projectLogo = userProject.imageDataUrl || null;
          console.log(`[DEBUG ME] Found project: ${projectName}, has logo: ${!!projectLogo}`);
        }
      } catch (e) {
        console.error('Error loading project for user:', e);
      }
    }

    // Return user data (without password) with project name and logo
    const { password: _, ...userWithoutPassword } = currentUser;
    res.json({
      ...userWithoutPassword,
      projectName,
      projectLogo
    });
  } catch (e) {
    res.status(401).json({ error: 'Invalid session' });
  }
});

// Generic collection endpoints
app.get('/api/:collection', async (req, res) => {
  try {
    const data = await readCollection(req.params.collection);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/:collection', async (req, res) => {
  try {
    const data = await readCollection(req.params.collection);
    const newItem = {
      id: nodeRandomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(newItem);
    await writeCollection(req.params.collection, data);
    res.json(newItem);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/:collection/:id', async (req, res) => {
  try {
    const data = await readCollection(req.params.collection);
    const item = data.find(item => item.id === req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/:collection/:id', async (req, res) => {
  try {
    const data = await readCollection(req.params.collection);
    const index = data.findIndex(item => item.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    data[index] = {
      ...data[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    await writeCollection(req.params.collection, data);
    res.json(data[index]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const data = await readCollection(req.params.collection);
    const index = data.findIndex(item => item.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    data.splice(index, 1);
    await writeCollection(req.params.collection, data);
    res.json({ ok: true, id: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Users management endpoints
app.get('/api/users', async (req, res) => {
  try {
    const users = await readCollection('users');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const users = await readCollection('users');
    
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    
    const newUser = {
      id: nodeRandomUUID(),
      ...req.body,
      password: hashedPassword, // Use hashed password
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    await writeCollection('users', users);
    
    // Don't return the password in the response
    const { password, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const users = await readCollection('users');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash password if it's being updated
    let updateData = { ...req.body };
    if (req.body.password) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(req.body.password, saltRounds);
    }
    
    users[index] = {
      ...users[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    await writeCollection('users', users);
    res.json(users[index]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const users = await readCollection('users');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    users.splice(index, 1);
    await writeCollection('users', users);
    res.json({ ok: true, id: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// BvA CSV endpoint (keep existing functionality)
app.get('/api/bva-csv', async (req, res) => {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/1KKOdBOtLNDqBGOhHFPgPLJNQCOdWWqcxJoqwPCJqNpI/export?format=csv&gid=0';
  
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const csvText = await response.text();
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvText);
  } catch (error) {
    console.error('Error fetching CSV:', error);
    res.status(500).json({ error: 'Failed to fetch CSV data' });
  }
});

// Migrate data from old data.json to new structure
async function migrateOldData() {
  try {
    const oldData = await fsp.readFile(DATA_PATH, 'utf8');
    const parsed = JSON.parse(oldData);
    
    if (parsed.projects && Array.isArray(parsed.projects)) {
      const existingProjects = await readCollection('projects');
      if (existingProjects.length === 0) {
        console.log(`[migration] Migrating ${parsed.projects.length} projects from data.json to content/projects.json`);
        await writeCollection('projects', parsed.projects);
      }
    }
  } catch (e) {
    // No old data to migrate
  }
}

// Startup
async function startup() {
  await ensureContentDir();
  await migrateOldData();
  
  const collections = await getCollections();
  console.log(`[BOOT] Detected collections: [${collections.join(', ')}]`);
  
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

startup().catch(console.error);



