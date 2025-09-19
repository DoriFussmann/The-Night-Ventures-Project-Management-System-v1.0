const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { randomUUID: nodeRandomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_PATH = path.join(__dirname, 'data.json');
const CONTENT_DIR = path.join(__dirname, 'content');

// Environment configuration
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'fallback-dev-secret-change-in-production';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth';
const ADMIN_ENABLED = process.env.ADMIN_ENABLED === 'true';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again in 5 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Utility function to ensure a collection exists
async function ensureCollection(slug, label, schema) {
  try {
    const collection = await prisma.collection.upsert({
      where: { slug },
      update: { label, schema },
      create: { slug, label, schema }
    });
    console.log(`Collection "${slug}" ensured:`, collection.id);
    return collection;
  } catch (error) {
    console.error(`Error ensuring collection "${slug}":`, error);
    throw error;
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.static('public'));

// Admin write protection middleware
function requireAdminWrites(req, res, next) {
  if (!ADMIN_ENABLED) {
    return res.status(403).json({ error: 'Writes disabled in this environment' });
  }
  next();
}

// JWT verification middleware
function verifyToken(req, res, next) {
  const token = req.cookies[AUTH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(token, AUTH_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}

// Auth middleware aliases
const requireAuth = verifyToken;

// Superadmin middleware
function requireSuperadmin(req, res, next) {
  if (!req.user || req.user.isSuperadmin !== true) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
}

// Page access middleware factory
function requirePage(slug) {
  return async function(req, res, next) {
    try {
      if (!req.user?.sub) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { pageAccess: true }
      });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      if (!user.pageAccess || user.pageAccess[slug] !== true) {
        return res.status(403).json({ error: `No access to page: ${slug}` });
      }
      
      next();
    } catch (e) {
      console.error('requirePage error', e);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

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
    console.log(`[DEBUG readCollection] Attempting to read: ${filePath}`);
    const exists = fs.existsSync(filePath);
    console.log(`[DEBUG readCollection] File exists: ${exists}`);
    
    if (!exists) {
      console.log(`[DEBUG readCollection] File does not exist, returning empty array`);
      return [];
    }
    
    const data = await fsp.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    console.log(`[DEBUG readCollection] Successfully parsed ${parsed.length} items from ${name}`);
    return parsed;
  } catch (e) {
    console.error(`[ERROR readCollection] Failed to read ${filePath}:`, e);
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

// Helper function to normalize page access
function normalizePageAccess(pageList, incomingAccess = {}) {
  const normalized = {};
  
  // Set all pages to false by default
  pageList.forEach(page => {
    normalized[page.slug] = false;
  });
  
  // Apply incoming access for matching slugs only
  Object.keys(incomingAccess).forEach(slug => {
    if (pageList.some(page => page.slug === slug)) {
      normalized[slug] = Boolean(incomingAccess[slug]);
    }
  });
  
  return normalized;
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return res.json({
        backend: 'postgres',
        writable: ADMIN_ENABLED,
        environment: IS_PRODUCTION ? 'production' : 'development',
        database: 'missing-env',
        message: 'DATABASE_URL not configured',
        timestamp: new Date().toISOString()
      });
    }

    // Test database connection with a simple count query
    const userCount = await prisma.user.count();
    res.json({
      backend: 'postgres',
      writable: ADMIN_ENABLED,
      environment: IS_PRODUCTION ? 'production' : 'development',
      database: 'connected',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      backend: 'postgres',
      writable: ADMIN_ENABLED,
      environment: IS_PRODUCTION ? 'production' : 'development',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Pages registry endpoint
app.get('/api/pages', async (req, res) => {
  try {
    const pages = await prisma.page.findMany({
      select: { slug: true, label: true },
      orderBy: { slug: 'asc' }
    });
    res.json(pages);
  } catch (e) {
    console.error('[ERROR] Failed to read pages:', e);
    res.status(500).json({ error: e.message });
  }
});


// Legacy projects endpoint (for backward compatibility)
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany();
    
    // Transform Prisma projects back to the expected format
    const transformedProjects = projects.map(project => {
      const notes = typeof project.notes === 'string' ? JSON.parse(project.notes || '{}') : project.notes || {};
      return {
        id: project.id,
        name: project.title,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        ...notes // Spread the notes object to maintain backward compatibility
      };
    });
    
    res.json(transformedProjects);
  } catch (e) {
    console.error('Error fetching projects:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/projects', requireAdminWrites, async (req, res) => {
  try {
    // Extract title and status from request body
    const { name, status, ...otherFields } = req.body;
    
    const newProject = await prisma.project.create({
      data: {
        title: name || 'Untitled Project',
        status: status || null,
        notes: JSON.stringify(otherFields) // Store other fields in notes
      }
    });
    
    // Transform back to expected format
    const notes = typeof newProject.notes === 'string' ? JSON.parse(newProject.notes || '{}') : newProject.notes || {};
    const responseProject = {
      id: newProject.id,
      name: newProject.title,
      status: newProject.status,
      createdAt: newProject.createdAt,
      updatedAt: newProject.updatedAt,
      ...notes
    };
    
    res.json(responseProject);
  } catch (e) {
    console.error('Error creating project:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/projects/:id', requireAdminWrites, async (req, res) => {
  try {
    // Extract title and status from request body
    const { name, status, ...otherFields } = req.body;
    
    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        title: name || undefined,
        status: status || undefined,
        notes: Object.keys(otherFields).length > 0 ? JSON.stringify(otherFields) : undefined
      }
    });
    
    // Transform back to expected format
    const notes = typeof updatedProject.notes === 'string' ? JSON.parse(updatedProject.notes || '{}') : updatedProject.notes || {};
    const responseProject = {
      id: updatedProject.id,
      name: updatedProject.title,
      status: updatedProject.status,
      createdAt: updatedProject.createdAt,
      updatedAt: updatedProject.updatedAt,
      ...notes
    };
    
    res.json(responseProject);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/projects/:id', requireAdminWrites, async (req, res) => {
  try {
    const deletedProject = await prisma.project.delete({
      where: { id: req.params.id },
      select: { id: true }
    });
    
    res.json({ ok: true, id: deletedProject.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Tasks management endpoints
app.get('/api/tasks', requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (e) {
    console.error('Error fetching tasks:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tasks', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const newTask = await prisma.task.create({
      data: {
        title: req.body.title || 'Untitled Task',
        description: req.body.description || null,
        status: req.body.status || 'todo',
        priority: req.body.priority || 'medium',
        assignee: req.body.assignee || null,
        project: req.body.project || null,
        projectName: req.body.projectName || null,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null
      }
    });
    res.json(newTask);
  } catch (e) {
    console.error('Error creating task:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/tasks/:id', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const updatedTask = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title || undefined,
        description: req.body.description || undefined,
        status: req.body.status || undefined,
        priority: req.body.priority || undefined,
        assignee: req.body.assignee || undefined,
        project: req.body.project || undefined,
        projectName: req.body.projectName || undefined,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
      }
    });
    res.json(updatedTask);
  } catch (e) {
    console.error('Error updating task:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tasks/:id', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const deletedTask = await prisma.task.delete({
      where: { id: req.params.id },
      select: { id: true }
    });
    res.json({ ok: true, id: deletedTask.id });
  } catch (e) {
    console.error('Error deleting task:', e);
    res.status(500).json({ error: e.message });
  }
});

// Dynamic Collections API endpoints
app.get('/api/collections', async (req, res) => {
  try {
    const collections = await prisma.collection.findMany({
      select: {
        id: true,
        slug: true,
        label: true,
        schema: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(collections);
  } catch (e) {
    console.error('Error fetching collections:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/collections', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const { slug, label, schema } = req.body;
    
    if (!slug || !label || !schema) {
      return res.status(400).json({ error: 'slug, label, and schema are required' });
    }

    const collection = await prisma.collection.upsert({
      where: { slug },
      update: { label, schema },
      create: { slug, label, schema }
    });
    
    res.json(collection);
  } catch (e) {
    console.error('Error creating/updating collection:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/collections/:slug/items', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify collection exists
    const collection = await prisma.collection.findUnique({
      where: { slug }
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const items = await prisma.item.findMany({
      where: { collectionId: collection.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.item.count({
      where: { collectionId: collection.id }
    });

    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    console.error('Error fetching collection items:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/collections/:slug/items', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const { slug } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data is required' });
    }

    // Verify collection exists
    const collection = await prisma.collection.findUnique({
      where: { slug }
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const item = await prisma.item.create({
      data: {
        collectionId: collection.id,
        data
      }
    });

    res.json(item);
  } catch (e) {
    console.error('Error creating collection item:', e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/collections/:slug/items/:id', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const { slug, id } = req.params;
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data is required' });
    }

    // Verify collection exists
    const collection = await prisma.collection.findUnique({
      where: { slug }
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Verify item exists and belongs to collection
    const existingItem = await prisma.item.findFirst({
      where: { 
        id,
        collectionId: collection.id 
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = await prisma.item.update({
      where: { id },
      data: { data }
    });

    res.json(item);
  } catch (e) {
    console.error('Error updating collection item:', e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/collections/:slug/items/:id', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const { slug, id } = req.params;

    // Verify collection exists
    const collection = await prisma.collection.findUnique({
      where: { slug }
    });
    
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Verify item exists and belongs to collection
    const existingItem = await prisma.item.findFirst({
      where: { 
        id,
        collectionId: collection.id 
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await prisma.item.delete({
      where: { id }
    });

    res.json({ ok: true, id });
  } catch (e) {
    console.error('Error deleting collection item:', e);
    res.status(500).json({ error: e.message });
  }
});

// OpenAI status generation endpoint
app.post('/api/generate-status', requireAuth, requireSuperadmin, async (req, res) => {
  try {
    const { projectData } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    // Prepare the prompt for OpenAI
    const prompt = `
Analyze the following project data and provide a comprehensive status summary:

Project Name: ${projectData.name}
Description: ${projectData.description}
Current Status: ${projectData.status}
Recent Updates: ${projectData.updates}

Tasks:
- To Do: ${projectData.tasks.todo.join(', ') || 'None'}
- In Progress: ${projectData.tasks.doing.join(', ') || 'None'}
- Completed: ${projectData.tasks.done.join(', ') || 'None'}

Please provide a concise status summary that includes:
1. Current project situation
2. What's being worked on now
3. Next steps and priorities
4. Any potential issues or blockers
5. Overall progress assessment

Keep the response professional and actionable, around 200-300 words.
`;

    // Make OpenAI API call
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a project management assistant that provides clear, actionable status summaries.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiResult = await openaiResponse.json();
    const summary = openaiResult.choices[0].message.content;

    res.json({ summary });
  } catch (error) {
    console.error('Error generating status:', error);
    res.status(500).json({ error: 'Failed to generate status summary' });
  }
});

// File upload endpoint
app.post('/api/upload', requireAuth, requireAdminWrites, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return the file URL
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Authentication endpoints (must be before generic collection routes)
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Use bcrypt to verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign({
      sub: user.id,
      email: user.email,
      isSuperadmin: user.isSuperadmin || false
    }, AUTH_JWT_SECRET, {
      expiresIn: '12h'
    });

    // Set secure JWT cookie
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      maxAge: 12 * 60 * 60 * 1000, // 12 hours
      sameSite: 'lax',
      secure: IS_PRODUCTION
    });

    // Get project name and logo for the user
    let projectName = 'No project assigned';
    let projectLogo = null;
    if (user.project) {
      try {
        const userProject = await prisma.project.findUnique({
          where: { id: user.project }
        });
        if (userProject) {
          projectName = userProject.title;
          // Extract logo from notes field if it exists
          const notes = typeof userProject.notes === 'string' ? JSON.parse(userProject.notes || '{}') : userProject.notes || {};
          projectLogo = notes.imageDataUrl || null;
          console.log(`[DEBUG LOGIN] Found project: ${projectName}, has logo: ${!!projectLogo}`);
          console.log(`[DEBUG LOGIN] Logo value: ${projectLogo}`);
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
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    maxAge: 0
  });
  res.json({ ok: true });
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    // Get fresh user data from database to ensure we have latest info
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperadmin: true,
        pageAccess: true,
        project: true,
        projectName: true,
        createdAt: true,
        updatedAt: true
        // Exclude password from response
      }
    });
    
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get project name and logo for the user
    let projectName = 'No project assigned';
    let projectLogo = null;
    if (currentUser.project) {
      try {
        const userProject = await prisma.project.findUnique({
          where: { id: currentUser.project }
        });
        if (userProject) {
          projectName = userProject.title;
          // Extract logo from notes field if it exists
          const notes = typeof userProject.notes === 'string' ? JSON.parse(userProject.notes || '{}') : userProject.notes || {};
          projectLogo = notes.imageDataUrl || null;
          console.log(`[DEBUG ME] Found project: ${projectName}, has logo: ${!!projectLogo}`);
          console.log(`[DEBUG ME] Logo value: ${projectLogo}`);
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
    console.log(`[DEBUG] Fetching collection: ${req.params.collection}`);
    console.log(`[DEBUG] Content dir: ${CONTENT_DIR}`);
    console.log(`[DEBUG] __dirname: ${__dirname}`);
    
    const data = await readCollection(req.params.collection);
    console.log(`[DEBUG] Found ${data.length} items in ${req.params.collection}`);
    res.json(data);
  } catch (e) {
    console.error(`[ERROR] Failed to read collection ${req.params.collection}:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/:collection', requireAdminWrites, async (req, res) => {
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

app.put('/api/:collection/:id', requireAdminWrites, async (req, res) => {
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

app.delete('/api/:collection/:id', requireAdminWrites, async (req, res) => {
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
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperadmin: true,
        pageAccess: true,
        project: true,
        projectName: true,
        createdAt: true,
        updatedAt: true
        // Exclude password from response
      }
    });
    res.json(users);
  } catch (e) {
    console.error('Error fetching users:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const pages = await prisma.page.findMany();
    
    // Hash the password before storing (only if not already hashed)
    const saltRounds = 10;
    let hashedPassword = req.body.password;
    if (req.body.password && !req.body.password.startsWith('$2b$')) {
      hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    }
    
    // Normalize pageAccess using the page registry
    const normalizedPageAccess = normalizePageAccess(pages, req.body.pageAccess);
    
    const newUser = await prisma.user.create({
      data: {
        email: req.body.email,
        firstName: req.body.firstName || null,
        lastName: req.body.lastName || null,
        password: hashedPassword,
        isSuperadmin: req.body.isSuperadmin || false,
        pageAccess: normalizedPageAccess,
        project: req.body.project || null,
        projectName: req.body.projectName || null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperadmin: true,
        pageAccess: true,
        project: true,
        projectName: true,
        createdAt: true,
        updatedAt: true
        // Exclude password from response
      }
    });
    
    res.json(newUser);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    const pages = await prisma.page.findMany();
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: req.params.id }
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prepare update data
    const updateData = {};
    
    // Hash password if it's being updated (only if not already hashed)
    if (req.body.password && !req.body.password.startsWith('$2b$')) {
      const saltRounds = 10;
      updateData.password = await bcrypt.hash(req.body.password, saltRounds);
    } else if (req.body.password) {
      updateData.password = req.body.password;
    }
    
    // Normalize pageAccess if it's being updated
    if (req.body.pageAccess) {
      updateData.pageAccess = normalizePageAccess(pages, req.body.pageAccess);
    }
    
    // Add other fields
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.firstName !== undefined) updateData.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) updateData.lastName = req.body.lastName;
    if (req.body.isSuperadmin !== undefined) updateData.isSuperadmin = req.body.isSuperadmin;
    if (req.body.project !== undefined) updateData.project = req.body.project;
    if (req.body.projectName !== undefined) updateData.projectName = req.body.projectName;
    
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isSuperadmin: true,
        pageAccess: true,
        project: true,
        projectName: true,
        createdAt: true,
        updatedAt: true
        // Exclude password from response
      }
    });
    
    res.json(updatedUser);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireSuperadmin, requireAdminWrites, async (req, res) => {
  try {
    // Check if user exists and delete
    const deletedUser = await prisma.user.delete({
      where: { id: req.params.id },
      select: { id: true }
    });
    
    res.json({ ok: true, id: deletedUser.id });
  } catch (e) {
    if (e.code === 'P2025') {
      // Prisma error code for record not found
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: e.message });
  }
});

// BvA CSV endpoint (keep existing functionality)
app.get('/api/bva-csv', verifyToken, requirePage('bva'), async (req, res) => {
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
  
  // Ensure default collections exist
  if (ADMIN_ENABLED === true) {
    const tasksSchema = {
      "fields": [
        { "key": "title", "label": "Title", "type": "string", "required": true },
        { "key": "status", "label": "Status", "type": "string", "enum": ["todo","doing","done"], "required": true },
        { "key": "assignee", "label": "Assignee", "type": "string" },
        { "key": "dueDate", "label": "Due Date", "type": "date" }
      ]
    };
    await ensureCollection('tasks', 'Tasks', tasksSchema);
  }
  
  const collections = await getCollections();
  console.log(`[BOOT] Detected collections: [${collections.join(', ')}]`);
  
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

startup().catch(console.error);



