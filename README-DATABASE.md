# Database Setup for The Night Ventures

## Overview
The admin system now uses Vercel Postgres for persistent data storage instead of local JSON files. This ensures admin edits persist on production deployments.

## Local Development Setup

### Option 1: Vercel Postgres (Recommended)
1. Create a Vercel project and add Postgres storage
2. Copy the `POSTGRES_URL` from Vercel Dashboard > Storage > Postgres
3. Create `.env` file in project root:
   ```
   POSTGRES_URL=postgresql://username:password@hostname:port/database
   PORT=5175
   ```

### Option 2: Local Postgres
1. Install PostgreSQL locally
2. Create a database: `createdb nightventures`
3. Create `.env` file:
   ```
   POSTGRES_URL=postgresql://localhost:5432/nightventures
   PORT=5175
   ```

### Option 3: Neon.tech (Free tier)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `.env`:
   ```
   POSTGRES_URL=postgresql://username:password@hostname/database
   PORT=5175
   ```

## Migration from JSON Files

If you have existing data in `/content/*.json` files:

```bash
# Run the migration script
npm run migrate

# Seed development data (requires POSTGRES_URL)
npm run seed
```

**Migration** will:
- Initialize the database schema (collections + auth/permissions tables)
- Seed initial pages data (bva, admin, home)
- Import all JSON files from `/content/` into the database
- Preserve all existing data with proper timestamps

**Seeding** will:
- Create admin user: `admin@site.test` (password: `changeme`)
- Add pages: `hub` (Hub) and `bva-dashboard` (BvA Dashboard)
- Create demo project: `Demo Project` (slug: `demo`)
- Assign admin user to demo project with admin role

**Note:** The seed script requires a real database connection (`POSTGRES_URL`) and will not work with the mock database.

## API Endpoints

The generic API remains the same:
- `GET /api/:collection` - List all items
- `POST /api/:collection` - Create new item
- `GET /api/:collection/:id` - Get single item
- `PUT /api/:collection/:id` - Update item
- `DELETE /api/:collection/:id` - Delete item
- `GET /api/admin/health` - Database health check

## Deployment to Vercel

1. Add `POSTGRES_URL` to Vercel project environment variables
2. Deploy normally - the database will be initialized automatically
3. Run migration if needed: `vercel exec npm run migrate`

## Schema

The database uses multiple table systems:

### Generic Collections System
- `collections` - Tracks available collection names
- `items` - Stores all data as JSONB with metadata

Each item includes:
- `id` (UUID) - Unique identifier
- `collection` (TEXT) - Collection name (e.g., 'projects', 'tasks')
- `data` (JSONB) - The actual item data
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### Auth and Permissions System
- `users` - User accounts with authentication
  - `id` (UUID) - Primary key
  - `email` (TEXT) - Unique email address
  - `password_hash` (TEXT) - Hashed password
  - `name` (TEXT) - Display name
  - `is_admin` (BOOLEAN) - Admin flag
  - `created_at` (TIMESTAMPTZ) - Account creation

- `projects` - Project definitions
  - `id` (UUID) - Primary key
  - `name` (TEXT) - Project name
  - `slug` (TEXT) - Unique URL slug
  - `created_at` (TIMESTAMPTZ) - Creation timestamp

- `user_projects` - User-project membership
  - `user_id` (UUID) - References users(id)
  - `project_id` (UUID) - References projects(id)
  - `role` (TEXT) - User role (default: 'member')

- `pages` - Available pages/tools
  - `slug` (TEXT) - Primary key (e.g., 'bva', 'admin')
  - `title` (TEXT) - Display title
  - `is_universal` (BOOLEAN) - Available to all projects
  - `is_hidden` (BOOLEAN) - Hidden from navigation

- `permissions` - Granular page permissions
  - `user_id` (UUID) - References users(id)
  - `project_id` (UUID) - References projects(id)
  - `page_slug` (TEXT) - References pages(slug)
  - `can_view` (BOOLEAN) - View permission
  - `can_edit` (BOOLEAN) - Edit permission
