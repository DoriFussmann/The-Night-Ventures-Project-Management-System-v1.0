import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import BvaPage from './BvaPage';
import { handleLogout } from '../utils/auth';

interface User {
  id: string;
  email: string;
  is_admin: boolean;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface AccessCheckResponse {
  access: boolean;
  user: User;
  project: Project;
  pageSlug: string;
}

export default function PageView() {
  const { projectSlug, pageSlug } = useParams<{ projectSlug: string; pageSlug: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessData, setAccessData] = useState<AccessCheckResponse | null>(null);

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
      if (response.status === 403) {
        throw new Error('ACCESS_DENIED');
      }
      const error = await response.text();
      throw new Error(error);
    }
    
    return response.json();
  };

  // Check access on mount
  useEffect(() => {
    const checkAccess = async () => {
      if (!projectSlug || !pageSlug) {
        setError('Invalid URL parameters');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const data = await apiCall(`/api/access-check/${projectSlug}/${pageSlug}`);
        setAccessData(data);
        setHasAccess(true);
      } catch (e) {
        if (e instanceof Error && e.message === 'ACCESS_DENIED') {
          setHasAccess(false);
        } else {
          setError('Failed to check access: ' + String(e));
        }
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [projectSlug, pageSlug]);

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
          <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h1 style={{ margin: 0 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  The Night Ventures
                </Link>
              </h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-sm" to="/bva">BvA Test</Link>
                <Link className="btn btn-sm" to="/admin">Admin</Link>
                <button 
                  className="btn btn-sm" 
                  onClick={handleLogout}
                  style={{ background: '#dc3545', color: 'white', border: 'none' }}
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </header>
        
        <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <div style={{ textAlign: 'center', padding: 48 }}>
            Checking access...
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
          <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h1 style={{ margin: 0 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  The Night Ventures
                </Link>
              </h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-sm" to="/bva">BvA Test</Link>
                <Link className="btn btn-sm" to="/admin">Admin</Link>
                <button 
                  className="btn btn-sm" 
                  onClick={handleLogout}
                  style={{ background: '#dc3545', color: 'white', border: 'none' }}
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </header>
        
        <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <div style={{ textAlign: 'center', padding: 48, color: 'red' }}>
            {error}
          </div>
        </main>
      </div>
    );
  }

  // Access denied state
  if (!hasAccess) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
          <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h1 style={{ margin: 0 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  The Night Ventures
                </Link>
              </h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-sm" to="/bva">BvA Test</Link>
                <Link className="btn btn-sm" to="/admin">Admin</Link>
                <button 
                  className="btn btn-sm" 
                  onClick={handleLogout}
                  style={{ background: '#dc3545', color: 'white', border: 'none' }}
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </header>
        
        <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center'
          }}>
            <div style={{
              padding: 48,
              background: 'white',
              borderRadius: 8,
              border: '1px solid #e5e5e5',
              maxWidth: 400
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
              <h2 style={{ margin: '0 0 16px 0', color: '#333' }}>No Access</h2>
              <p style={{ margin: '0 0 24px 0', color: '#666' }}>
                You don't have permission to view this page.
              </p>
              <p style={{ margin: '0 0 24px 0', color: '#888', fontSize: 14 }}>
                Project: <strong>{projectSlug}</strong><br />
                Page: <strong>{pageSlug}</strong>
              </p>
              <Link 
                to={`/app/${projectSlug}`}
                className="btn"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#007bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Back to Workspace
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Access granted - render the actual page content
  // Special handling for BvA Dashboard
  if (pageSlug === 'bva-dashboard') {
    return <BvaPage />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h1 style={{ margin: 0 }}>
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                The Night Ventures
              </Link>
            </h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="btn btn-sm" to="/bva">BvA Test</Link>
              <Link className="btn btn-sm" to="/admin">Admin</Link>
              <Link className="btn btn-sm" to={`/app/${projectSlug}`}>Workspace</Link>
              <button 
                className="btn btn-sm" 
                onClick={handleLogout}
                style={{ background: '#dc3545', color: 'white', border: 'none' }}
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 24, fontSize: 14, color: '#666' }}>
          <Link to={`/app/${projectSlug}`} style={{ color: '#007bff', textDecoration: 'none' }}>
            {accessData?.project.name || projectSlug}
          </Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ textTransform: 'capitalize' }}>{pageSlug}</span>
        </div>

        {/* Page Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: '0 0 8px 0', textTransform: 'capitalize' }}>
            {pageSlug.replace(/-/g, ' ')}
          </h1>
          <p style={{ margin: 0, color: '#666' }}>
            Project: {accessData?.project.name}
          </p>
        </div>

        {/* Page Content */}
        <div style={{
          background: 'white',
          border: '1px solid #e5e5e5',
          borderRadius: 4,
          padding: 24
        }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Page Content</h3>
          <p style={{ margin: '0 0 16px 0' }}>
            This is the content for the <strong>{pageSlug}</strong> page in the <strong>{accessData?.project.name}</strong> project.
          </p>
          
          {/* Placeholder content based on page type */}
          {pageSlug === 'hub' && (
            <div>
              <h4>Project Hub</h4>
              <p>Welcome to the project hub. Here you can find an overview of all project activities, recent updates, and quick access to important resources.</p>
            </div>
          )}
          
          {pageSlug === 'admin' && (
            <div>
              <h4>Administration</h4>
              <p>Administrative functions and settings for this project. Manage users, permissions, and project configuration.</p>
            </div>
          )}
          
          {!['hub', 'bva-dashboard', 'admin'].includes(pageSlug) && (
            <div>
              <h4>Custom Page</h4>
              <p>This is a custom page for your project. You can add any content or functionality specific to your needs here.</p>
            </div>
          )}

          <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 4 }}>
            <h5 style={{ margin: '0 0 8px 0' }}>Debug Information</h5>
            <p style={{ margin: 0, fontSize: 12, fontFamily: 'monospace' }}>
              User: {accessData?.user.email} ({accessData?.user.is_admin ? 'Admin' : 'User'})<br />
              Project ID: {accessData?.project.id}<br />
              Page Slug: {accessData?.pageSlug}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
