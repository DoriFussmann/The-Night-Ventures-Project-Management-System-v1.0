const express = require('express');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { randomUUID: nodeRandomUUID } = require('crypto');
const { initSchema, listCollections, getAll, getOne, createOne, updateOne, deleteOne, getCollectionMeta, seedInitialData } = require('./lib/store-db');
const { sign, verify, getCookieOptions } = require('./lib/jwt');

const app = express();
const PORT = process.env.PORT || 5175;
const DATA_PATH = path.join(__dirname, 'data.json');

// Check if we're using mock database (no POSTGRES_URL)
const useMockDb = !process.env.POSTGRES_URL;

// Authentication middleware
function authMiddleware(req, res, next) {
  try {
    const sessionCookie = req.headers.cookie
      ?.split(';')
      ?.find(c => c.trim().startsWith('session='))
      ?.split('=')[1];

    if (!sessionCookie) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verify(sessionCookie);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      is_admin: decoded.is_admin
    };

    next();
  } catch (e) {
    console.error('[AUTH] Token verification failed:', e.message);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Project access control helper
function requireProjectAccess(projectSlug, pageSlug) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let project;
      let projectId;

      if (useMockDb) {
        // Mock database: create dummy project data
        project = {
          id: `mock-project-${projectSlug}`,
          name: `Mock ${projectSlug}`,
          slug: projectSlug
        };
        projectId = project.id;
        
        // For mock, admin users have access to everything, regular users have limited access
        if (!req.user.is_admin && projectSlug !== 'demo') {
          return res.status(403).json({ error: 'Access denied to this project' });
        }
      } else {
        // Real database: load project and check permissions
        const { sql } = require('./lib/db');
        
        // Load project by slug
        const projectResult = await sql`
          SELECT id, name, slug 
          FROM projects 
          WHERE slug = ${projectSlug}
          LIMIT 1
        `;

        if (projectResult.rows.length === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }

        project = projectResult.rows[0];
        projectId = project.id;

        // Skip permission checks for admin users
        if (!req.user.is_admin) {
          // Check user is member of project
          const memberResult = await sql`
            SELECT 1 
            FROM user_projects 
            WHERE user_id = ${req.user.id}::uuid 
            AND project_id = ${projectId}::uuid
            LIMIT 1
          `;

          if (memberResult.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied to this project' });
          }

          // Check page permissions if pageSlug is provided
          if (pageSlug) {
            const permissionResult = await sql`
              SELECT can_view 
              FROM permissions 
              WHERE user_id = ${req.user.id}::uuid 
              AND project_id = ${projectId}::uuid 
              AND page_slug = ${pageSlug}
              LIMIT 1
            `;

            // If no specific permission exists, check if page is universal
            if (permissionResult.rows.length === 0) {
              const pageResult = await sql`
                SELECT is_universal 
                FROM pages 
                WHERE slug = ${pageSlug}
                LIMIT 1
              `;

              if (pageResult.rows.length === 0 || !pageResult.rows[0].is_universal) {
                return res.status(403).json({ error: 'Access denied to this page' });
              }
            } else if (!permissionResult.rows[0].can_view) {
              return res.status(403).json({ error: 'Access denied to this page' });
            }
          }
        }
      }

      // Attach context to request
      req.ctx = {
        projectId,
        projectSlug,
        pageSlug,
        project
      };

      next();
    } catch (e) {
      console.error('[AUTH] Project access check failed:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Collection validation is now handled by the database store

function slugify(s) { return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Root can show simple status
app.get('/', (_req, res) => {
  res.type('text/plain').send('API server is running');
});

// Health endpoint for debugging
app.get('/api/admin/health', async (_req, res) => {
  try {
    const collections = await listCollections();
    
    const collectionMetas = await Promise.all(
      collections.map(c => getCollectionMeta(c))
    );
    
    res.json({
      db: 'ok',
      collections: collectionMetas
    });
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user;

    if (useMockDb) {
      // Mock database: allow any email/password and return dummy user
      console.log('[AUTH] Using mock authentication for development');
      user = {
        id: 'mock-user-id',
        email: email,
        is_admin: email.includes('admin'),
        name: email.includes('admin') ? 'Mock Admin' : 'Mock User'
      };
    } else {
      // Real database: verify credentials
      const { sql } = require('./lib/db');
      const result = await sql`
        SELECT id, email, password_hash, name, is_admin 
        FROM users 
        WHERE email = ${email}
        LIMIT 1
      `;

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const dbUser = result.rows[0];
      const passwordValid = await bcrypt.compare(password, dbUser.password_hash);

      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      user = {
        id: dbUser.id,
        email: dbUser.email,
        is_admin: dbUser.is_admin,
        name: dbUser.name
      };
    }

    // Create JWT token
    const token = sign({
      sub: user.id,
      email: user.email,
      is_admin: user.is_admin
    });

    // Set session cookie
    res.cookie('session', token, getCookieOptions());

    // Return user info (without sensitive data)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: user.is_admin
      }
    });

  } catch (e) {
    console.error('[AUTH] Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  try {
    // Clear the session cookie
    res.clearCookie('session', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (e) {
    console.error('[AUTH] Logout error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin middleware - requires admin privileges
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Admin API Routes
// Users management
app.get('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (useMockDb) {
      // Mock users for development
      const mockUsers = [
        { id: 'mock-admin-id', email: 'admin@test.com', name: 'Mock Admin', is_admin: true, created_at: new Date().toISOString() },
        { id: 'mock-user-id', email: 'user@test.com', name: 'Mock User', is_admin: false, created_at: new Date().toISOString() }
      ];
      return res.json(mockUsers);
    }

    const { sql } = require('./lib/db');
    const result = await sql`
      SELECT id, email, name, is_admin, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    res.json(result.rows);
  } catch (e) {
    console.error('[ADMIN] Error fetching users:', e);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (useMockDb) {
      // Mock user creation for development
      const mockUser = {
        id: `mock-user-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        is_admin: false,
        created_at: new Date().toISOString()
      };
      return res.json(mockUser);
    }

    const { sql } = require('./lib/db');
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await sql`
      INSERT INTO users (email, password_hash, name, is_admin)
      VALUES (${email}, ${passwordHash}, ${name || email.split('@')[0]}, false)
      RETURNING id, email, name, is_admin, created_at
    `;
    
    res.json(result.rows[0]);
  } catch (e) {
    console.error('[ADMIN] Error creating user:', e);
    if (e.message.includes('duplicate key')) {
      res.status(400).json({ error: 'User with this email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Projects management
app.get('/api/admin/projects', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (useMockDb) {
      // Mock projects for development
      const mockProjects = [
        { id: 'mock-project-demo', name: 'Demo Project', slug: 'demo', created_at: new Date().toISOString() },
        { id: 'mock-project-test', name: 'Test Project', slug: 'test', created_at: new Date().toISOString() }
      ];
      return res.json(mockProjects);
    }

    const { sql } = require('./lib/db');
    const result = await sql`
      SELECT id, name, slug, created_at 
      FROM projects 
      ORDER BY created_at DESC
    `;
    res.json(result.rows);
  } catch (e) {
    console.error('[ADMIN] Error fetching projects:', e);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/admin/projects', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const slug = slugify(name);

    if (useMockDb) {
      // Mock project creation for development
      const mockProject = {
        id: `mock-project-${slug}`,
        name,
        slug,
        created_at: new Date().toISOString()
      };
      return res.json(mockProject);
    }

    const { sql } = require('./lib/db');
    const result = await sql`
      INSERT INTO projects (name, slug)
      VALUES (${name}, ${slug})
      RETURNING id, name, slug, created_at
    `;
    
    res.json(result.rows[0]);
  } catch (e) {
    console.error('[ADMIN] Error creating project:', e);
    if (e.message.includes('duplicate key')) {
      res.status(400).json({ error: 'Project with this slug already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

// Pages management (for permissions)
app.get('/api/admin/pages', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (useMockDb) {
      // Mock pages for development
      const mockPages = [
        { slug: 'hub', title: 'Hub', is_universal: true, is_hidden: false },
        { slug: 'bva-dashboard', title: 'BvA Dashboard', is_universal: true, is_hidden: false },
        { slug: 'admin', title: 'Admin', is_universal: false, is_hidden: false }
      ];
      return res.json(mockPages);
    }

    const { sql } = require('./lib/db');
    const result = await sql`
      SELECT slug, title, is_universal, is_hidden 
      FROM pages 
      ORDER BY title
    `;
    res.json(result.rows);
  } catch (e) {
    console.error('[ADMIN] Error fetching pages:', e);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Permissions management
app.get('/api/admin/permissions/:userId/:projectId', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { userId, projectId } = req.params;

    if (useMockDb) {
      // Mock permissions for development
      const mockPermissions = [
        { page_slug: 'hub', can_view: true, can_edit: false },
        { page_slug: 'bva-dashboard', can_view: true, can_edit: false },
        { page_slug: 'admin', can_view: false, can_edit: false }
      ];
      return res.json(mockPermissions);
    }

    const { sql } = require('./lib/db');
    
    // Get all pages and their permissions for this user/project
    const result = await sql`
      SELECT 
        p.slug as page_slug,
        p.title,
        p.is_universal,
        COALESCE(perm.can_view, p.is_universal) as can_view,
        COALESCE(perm.can_edit, false) as can_edit
      FROM pages p
      LEFT JOIN permissions perm ON (
        perm.page_slug = p.slug 
        AND perm.user_id = ${userId}::uuid 
        AND perm.project_id = ${projectId}::uuid
      )
      ORDER BY p.title
    `;
    
    res.json(result.rows);
  } catch (e) {
    console.error('[ADMIN] Error fetching permissions:', e);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

app.put('/api/admin/permissions/bulk', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { user_id, project_id, permissions } = req.body;
    
    if (!user_id || !project_id || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'user_id, project_id, and permissions array are required' });
    }

    if (useMockDb) {
      // Mock permissions update for development
      console.log('[ADMIN] Mock permissions update:', { user_id, project_id, permissions });
      return res.json({ message: 'Permissions updated (mock)', updated: permissions.length });
    }

    const { sql } = require('./lib/db');
    
    // Delete existing permissions for this user/project
    await sql`
      DELETE FROM permissions 
      WHERE user_id = ${user_id}::uuid 
      AND project_id = ${project_id}::uuid
    `;
    
    // Insert new permissions (only non-default ones)
    for (const perm of permissions) {
      if (perm.can_view !== undefined || perm.can_edit !== undefined) {
        await sql`
          INSERT INTO permissions (user_id, project_id, page_slug, can_view, can_edit)
          VALUES (
            ${user_id}::uuid, 
            ${project_id}::uuid, 
            ${perm.page_slug}, 
            ${perm.can_view || false}, 
            ${perm.can_edit || false}
          )
          ON CONFLICT (user_id, project_id, page_slug) 
          DO UPDATE SET 
            can_view = EXCLUDED.can_view,
            can_edit = EXCLUDED.can_edit
        `;
      }
    }
    
    res.json({ message: 'Permissions updated successfully', updated: permissions.length });
  } catch (e) {
    console.error('[ADMIN] Error updating permissions:', e);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// User workspace API routes
// Get user's projects (only projects they belong to)
app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    if (useMockDb) {
      // Mock projects for development - admin sees all, regular users see limited
      const mockProjects = [
        { id: 'mock-project-demo', name: 'Demo Project', slug: 'demo', created_at: new Date().toISOString() }
      ];
      
      if (req.user.is_admin) {
        mockProjects.push({ id: 'mock-project-test', name: 'Test Project', slug: 'test', created_at: new Date().toISOString() });
      }
      
      return res.json(mockProjects);
    }

    const { sql } = require('./lib/db');
    
    if (req.user.is_admin) {
      // Admin users see all projects
      const result = await sql`
        SELECT id, name, slug, created_at 
        FROM projects 
        ORDER BY name
      `;
      res.json(result.rows);
    } else {
      // Regular users see only projects they belong to
      const result = await sql`
        SELECT p.id, p.name, p.slug, p.created_at 
        FROM projects p
        INNER JOIN user_projects up ON p.id = up.project_id
        WHERE up.user_id = ${req.user.id}::uuid
        ORDER BY p.name
      `;
      res.json(result.rows);
    }
  } catch (e) {
    console.error('[API] Error fetching user projects:', e);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get all non-hidden pages
app.get('/api/pages', authMiddleware, async (req, res) => {
  try {
    if (useMockDb) {
      // Mock pages for development
      const mockPages = [
        { slug: 'hub', title: 'Hub', is_universal: true, is_hidden: false },
        { slug: 'bva-dashboard', title: 'BvA Dashboard', is_universal: true, is_hidden: false }
      ];
      return res.json(mockPages);
    }

    const { sql } = require('./lib/db');
    const result = await sql`
      SELECT slug, title, is_universal, is_hidden 
      FROM pages 
      WHERE is_hidden = false
      ORDER BY title
    `;
    res.json(result.rows);
  } catch (e) {
    console.error('[API] Error fetching pages:', e);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

// Get user's permissions for a specific project
app.get('/api/permissions/:projectSlug', authMiddleware, async (req, res) => {
  try {
    const { projectSlug } = req.params;

    if (useMockDb) {
      // Mock permissions for development
      const mockPermissions = req.user.is_admin 
        ? ['hub', 'bva-dashboard', 'admin'] // Admin has access to all pages
        : projectSlug === 'demo' 
          ? ['hub', 'bva-dashboard'] // Regular users have limited access to demo project
          : []; // No access to other projects
      
      return res.json(mockPermissions);
    }

    const { sql } = require('./lib/db');
    
    // First get the project ID
    const projectResult = await sql`
      SELECT id FROM projects WHERE slug = ${projectSlug} LIMIT 1
    `;
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectId = projectResult.rows[0].id;
    
    if (req.user.is_admin) {
      // Admin users have access to all non-hidden pages
      const pagesResult = await sql`
        SELECT slug FROM pages WHERE is_hidden = false
      `;
      const allowedPages = pagesResult.rows.map(row => row.slug);
      return res.json(allowedPages);
    }
    
    // Check if user is member of project
    const memberResult = await sql`
      SELECT 1 FROM user_projects 
      WHERE user_id = ${req.user.id}::uuid AND project_id = ${projectId}::uuid
      LIMIT 1
    `;
    
    if (memberResult.rows.length === 0) {
      return res.json([]); // No access if not a project member
    }
    
    // Get pages user has access to (either universal or explicitly granted)
    const permissionsResult = await sql`
      SELECT DISTINCT p.slug
      FROM pages p
      LEFT JOIN permissions perm ON (
        perm.page_slug = p.slug 
        AND perm.user_id = ${req.user.id}::uuid 
        AND perm.project_id = ${projectId}::uuid
      )
      WHERE p.is_hidden = false 
      AND (
        p.is_universal = true 
        OR perm.can_view = true
      )
      ORDER BY p.slug
    `;
    
    const allowedPages = permissionsResult.rows.map(row => row.slug);
    res.json(allowedPages);
  } catch (e) {
    console.error('[API] Error fetching permissions:', e);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// Access check endpoint for page access validation
app.get('/api/access-check/:projectSlug/:pageSlug', 
  authMiddleware, 
  (req, res, next) => {
    // Extract parameters and apply project access middleware
    const { projectSlug, pageSlug } = req.params;
    requireProjectAccess(projectSlug, pageSlug)(req, res, next);
  },
  (req, res) => {
    // If we reach here, access is granted
    res.json({
      access: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        is_admin: req.user.is_admin
      },
      project: req.ctx.project,
      pageSlug: req.ctx.pageSlug
    });
  }
);

// BvA data endpoint
app.get('/api/bva', authMiddleware, async (req, res) => {
  try {
    const { period } = req.query;
    const projectSlug = req.headers['x-project-slug'] || req.query.projectSlug;
    
    if (!projectSlug) {
      return res.status(400).json({ error: 'Project slug is required' });
    }

    // Apply project access middleware
    const middleware = requireProjectAccess(projectSlug, 'bva-dashboard');
    
    // Execute middleware and wait for completion
    await new Promise((resolve, reject) => {
      middleware(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const projectId = req.ctx.projectId;
    const project = req.ctx.project;
    
    // Mock BvA data for now - in a real implementation, this would query the database
    const mockBvaData = [
      {
        date: '2024-01-01',
        company: 'The Night Ventures',
        category: 'Revenue',
        subcategory: 'Consulting',
        planned: 50000,
        actual: 45000,
        variance: -5000,
        period: period || '2024-01'
      },
      {
        date: '2024-01-01',
        company: 'The Night Ventures', 
        category: 'Expenses',
        subcategory: 'Marketing',
        planned: 10000,
        actual: 12000,
        variance: 2000,
        period: period || '2024-01'
      },
      {
        date: '2024-01-01',
        company: 'The Night Ventures',
        category: 'Expenses', 
        subcategory: 'Operations',
        planned: 15000,
        actual: 14500,
        variance: -500,
        period: period || '2024-01'
      },
      {
        date: '2024-01-01',
        company: 'BlueMark',
        category: 'Revenue',
        subcategory: 'Services',
        planned: 25000,
        actual: 28000,
        variance: 3000,
        period: period || '2024-01'
      },
      {
        date: '2024-01-01',
        company: 'BlueMark',
        category: 'Expenses',
        subcategory: 'Staff',
        planned: 8000,
        actual: 8200,
        variance: 200,
        period: period || '2024-01'
      }
    ];

    // Filter by period if specified
    let filteredData = mockBvaData;
    if (period) {
      filteredData = mockBvaData.filter(row => row.period === period);
    }

    // If no data found for this project in DB, fall back to CSV fetch
    if (filteredData.length === 0) {
      console.log(`[BVA] No data found for project ${projectId}, falling back to CSV`);
      
      // Fallback to original CSV logic
      const csvUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv';
      
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        
        // Parse CSV (simplified - you might want to use a proper CSV parser)
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const csvData = lines.slice(1).map(line => {
          const values = line.split(',');
          const row = {};
          headers.forEach((header, index) => {
            row[header.trim()] = values[index]?.trim() || '';
          });
          return row;
        }).filter(row => Object.values(row).some(val => val)); // Remove empty rows
        
        return res.json({
          data: csvData,
          source: 'csv',
          project: project,
          period: period || 'all'
        });
      } catch (csvError) {
        console.error('[BVA] CSV fallback failed:', csvError);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }
    }

    res.json({
      data: filteredData,
      source: 'database',
      project: project,
      period: period || 'all'
    });

  } catch (e) {
    console.error('[BVA] Error fetching BvA data:', e);
    res.status(500).json({ error: 'Failed to fetch BvA data' });
  }
});

// Test endpoint to demonstrate project access middleware
app.get('/api/projects/:projectSlug/pages/:pageSlug/test', 
  authMiddleware, 
  (req, res, next) => {
    // Extract parameters and apply project access middleware
    const { projectSlug, pageSlug } = req.params;
    requireProjectAccess(projectSlug, pageSlug)(req, res, next);
  },
  (req, res) => {
    res.json({
      message: 'Access granted',
      user: {
        id: req.user.id,
        email: req.user.email,
        is_admin: req.user.is_admin
      },
      context: req.ctx
    });
  }
);

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
    const existingList = await getAll('projects');
    if (Array.isArray(existingList) && existingList.length > 0) return; // already migrated/has data

    if (fs.existsSync(DATA_PATH)) {
      const legacy = readLegacyAll();
      const map = legacy.projects || {};
      const now = new Date().toISOString();
      
      for (const [id, p] of Object.entries(map)) {
        const name = p.name || 'Untitled';
        const item = {
          ...p,
          id,
          name,
          slug: slugify(name),
          createdAt: now,
          updatedAt: now,
        };
        await createOne('projects', item);
      }
      console.log(`[migration] Migrated ${Object.keys(map).length} projects from data.json to content/projects.json`);
    }
  } catch (e) {
    console.warn('[migration] skipped or failed:', e && e.message ? e.message : e);
  }
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
    const created = await createOne('projects', { ...project, id: maybeId });
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
    await updateOne('projects', id, project);
    res.json({ ok: true });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    res.status(status).json({ error: e && e.message ? e.message : String(e) });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteOne('projects', id);
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
    const list = await getAll(c);
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/:collection', async (req, res) => {
  try {
    const c = req.params.collection;
    const body = req.body || {};
    const created = await createOne(c, body);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get('/api/:collection/:id', async (req, res) => {
  try {
    const c = req.params.collection;
    const id = req.params.id;
    const item = await getOne(c, id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.put('/api/:collection/:id', async (req, res) => {
  try {
    const c = req.params.collection;
    const id = req.params.id;
    const patch = req.body || {};
    const updated = await updateOne(c, id, patch);
    res.json(updated);
  } catch (e) {
    if (e.message === 'Item not found') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const c = req.params.collection;
    const id = req.params.id;
    const result = await deleteOne(c, id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// Startup: initialize database, migrate legacy data, then listen
(async () => {
  try {
    // Initialize database schema
    console.log('[BOOT] Initializing database schema...');
    await initSchema();
    
    console.log('[BOOT] Seeding initial data...');
    await seedInitialData();
    
    // Boot logs
    const collections = await listCollections();
    console.log('[BOOT] Database initialized');
    console.log('[BOOT] Detected collections:', collections);
    
    await migrateLegacyProjectsIfNeeded();
    
    app.listen(PORT, () => {
      console.log(`API server listening on http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('[BOOT] Failed to start server:', e);
    process.exit(1);
  }
})();


