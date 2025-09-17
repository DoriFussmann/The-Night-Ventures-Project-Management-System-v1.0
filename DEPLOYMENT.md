# Deployment Guide

## Environment Variables

### Required for Production

#### Vercel Environment Variables
Set these in your Vercel project dashboard:

```bash
# Database Connection
POSTGRES_URL=postgresql://username:password@host:port/database

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-key-here
```

### Optional Environment Variables

```bash
# Server Port (defaults to 5175)
PORT=5175

# Node Environment
NODE_ENV=production
```

## JWT Secret Generation

Generate a secure JWT secret:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 64

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/64
```

## Development vs Production Behavior

### Development Mode (No POSTGRES_URL)
- ✅ **Mock Database**: Uses in-memory mock database
- ✅ **Permissive Auth**: Any email/password combination works
- ✅ **Single Demo Project**: Assumes "demo" project exists
- ✅ **Admin Detection**: Emails containing "admin" get admin privileges
- ✅ **JWT Fallback**: Uses development JWT secret

### Production Mode (With POSTGRES_URL)
- ✅ **Real Database**: Uses Vercel Postgres
- ✅ **Secure Auth**: Validates against stored password hashes
- ✅ **Project Management**: Full project and user management
- ✅ **Permission Control**: Page-level permissions enforced
- ✅ **Secure JWT**: Uses production JWT secret

## Cookie Configuration

Cookies are configured for security:

```javascript
{
  httpOnly: true,      // Prevents XSS attacks
  sameSite: 'lax',     // CSRF protection
  path: '/',           // Available site-wide
  maxAge: 7 days,      // 7-day expiration
  secure: production   // HTTPS only in production
}
```

## Database Schema

The system uses these tables:

### Authentication & Authorization
- `users` - User accounts with password hashes
- `projects` - Project definitions
- `user_projects` - User-project membership
- `pages` - Available pages/features
- `permissions` - Page-level access control

### Generic Collections (Existing)
- `collections` - Collection definitions
- `items` - Generic data storage

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Admin Management
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/projects` - List projects
- `POST /api/admin/projects` - Create project
- `GET /api/admin/pages` - List pages
- `PUT /api/admin/permissions/bulk` - Update permissions

### User Workspace
- `GET /api/projects` - User's accessible projects
- `GET /api/pages` - Available pages
- `GET /api/permissions/:projectSlug` - User's page permissions
- `GET /api/access-check/:projectSlug/:pageSlug` - Check page access

### Data Access
- `GET /api/bva` - BvA data with project context
- `GET /api/:collection` - Generic collection access (existing)

## Deployment Steps

1. **Set Environment Variables** in Vercel:
   - `POSTGRES_URL` - Your database connection string
   - `JWT_SECRET` - Secure random string (64+ characters)

2. **Deploy to Vercel**:
   ```bash
   vercel deploy
   ```

3. **Run Database Setup** (one-time):
   ```bash
   # If you have existing JSON data to migrate
   npm run migrate
   
   # Create initial admin user and demo project
   npm run seed
   ```

4. **Verify Deployment**:
   - Visit your deployed URL
   - Login with admin credentials
   - Test project and permission management

## Security Considerations

### JWT Security
- ✅ **Secure Secret**: Use cryptographically secure random JWT secret
- ✅ **HttpOnly Cookies**: Prevents client-side access to tokens
- ✅ **SameSite Protection**: Prevents CSRF attacks
- ✅ **Secure Flag**: HTTPS-only cookies in production

### Database Security
- ✅ **Password Hashing**: Uses bcrypt for password storage
- ✅ **SQL Injection Protection**: Uses parameterized queries
- ✅ **Connection Security**: Uses SSL/TLS for database connections

### Permission Model
- ✅ **Page-Level Permissions**: Granular access control
- ✅ **Admin Override**: Admins bypass permission checks
- ✅ **Project Isolation**: Users only access assigned projects
- ✅ **API Protection**: All endpoints require authentication

## Troubleshooting

### Common Issues

**Login Issues:**
- Check JWT_SECRET is set in production
- Verify POSTGRES_URL connection
- Check user exists in database

**Permission Issues:**
- Verify user has project membership
- Check page permissions are set
- Admin users bypass all restrictions

**Database Issues:**
- Run migration script if tables missing
- Check POSTGRES_URL format
- Verify database connectivity

### Development Mode
If you need to test without a database:
- Remove or comment out POSTGRES_URL
- System will use mock database
- Any credentials will work for login
