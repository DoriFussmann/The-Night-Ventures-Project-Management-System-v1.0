import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    is_admin: boolean;
  };
}

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API helper
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    return response.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Login
      const loginResponse: LoginResponse = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('Login successful:', loginResponse.user);

      // Step 2: Fetch user's projects
      const projects: Project[] = await apiCall('/api/projects');
      console.log('User projects:', projects);

      // Step 3: Redirect based on project count
      if (projects.length === 0) {
        // No projects - redirect to home
        navigate('/');
      } else if (projects.length === 1) {
        // Single project - redirect directly to workspace
        navigate(`/app/${projects[0].slug}`);
      } else {
        // Multiple projects - redirect to first project (or could go to home)
        navigate(`/app/${projects[0].slug}`);
      }

    } catch (e: any) {
      console.error('Login failed:', e);
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: 'white',
        padding: 48,
        borderRadius: 8,
        border: '1px solid #e5e5e5',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        width: '100%',
        maxWidth: 400
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 24 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              The Night Ventures
            </Link>
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: 12,
            borderRadius: 4,
            marginBottom: 24,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 'bold' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={loading}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 'bold' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 14,
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: loading ? '#9ca3af' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Development Helper */}
        <div style={{
          marginTop: 24,
          padding: 16,
          background: '#f8f9fa',
          borderRadius: 4,
          fontSize: 12,
          color: '#666'
        }}>
          <strong>Development Mode:</strong><br />
          Any email/password combination will work.<br />
          Try: admin@test.com / test123 (admin)<br />
          Or: user@test.com / test123 (regular user)
        </div>

        {/* Footer Links */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/" style={{ color: '#007bff', textDecoration: 'none', fontSize: 14 }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
