import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { handleLogout } from '../utils/auth';

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface Page {
  slug: string;
  title: string;
  is_universal: boolean;
  is_hidden: boolean;
}

export default function Workspace() {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  // Show toast message
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Load user's projects
  const loadProjects = async () => {
    try {
      const data = await apiCall('/api/projects');
      setProjects(data);
      
      // If no projectSlug in URL and we have projects, redirect to first project
      if (!projectSlug && data.length > 0) {
        navigate(`/app/${data[0].slug}`, { replace: true });
        return;
      }
      
      // If projectSlug doesn't exist in user's projects, redirect to first available
      if (projectSlug && data.length > 0 && !data.find(p => p.slug === projectSlug)) {
        navigate(`/app/${data[0].slug}`, { replace: true });
        return;
      }
    } catch (e) {
      setError('Failed to load projects: ' + String(e));
    }
  };

  // Load all available pages
  const loadPages = async () => {
    try {
      const data = await apiCall('/api/pages');
      setPages(data);
    } catch (e) {
      setError('Failed to load pages: ' + String(e));
    }
  };

  // Load user's permissions for current project
  const loadPermissions = async () => {
    if (!projectSlug) return;
    
    try {
      const data = await apiCall(`/api/permissions/${projectSlug}`);
      setAllowedPages(data);
    } catch (e) {
      setError('Failed to load permissions: ' + String(e));
    }
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadProjects(),
        loadPages(),
        loadPermissions()
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and when project changes
  useEffect(() => {
    loadData();
  }, [projectSlug]);

  // Handle project switch
  const handleProjectSwitch = (newProjectSlug: string) => {
    if (newProjectSlug !== projectSlug) {
      navigate(`/app/${newProjectSlug}`);
    }
  };

  // Handle page click
  const handlePageClick = (pageSlug: string) => {
    if (allowedPages.includes(pageSlug)) {
      navigate(`/app/${projectSlug}/${pageSlug}`);
    } else {
      showToast('No access — contact admin.');
    }
  };

  // Get current project
  const currentProject = projects.find(p => p.slug === projectSlug);

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
            Loading workspace...
          </div>
        </main>
      </div>
    );
  }

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

  if (projects.length === 0) {
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
            <h2>No Projects Available</h2>
            <p style={{ color: '#666', marginBottom: 24 }}>
              You don't have access to any projects. Contact your administrator to get access.
            </p>
            <Link to="/admin" className="btn">
              Go to Admin
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: '#f8d7da',
          color: '#721c24',
          padding: '12px 16px',
          borderRadius: 4,
          border: '1px solid #f5c6cb',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {toast}
        </div>
      )}

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
            </div>
          </nav>
        </div>
      </header>

      <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
        {/* Project Switcher */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Workspace</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 14, fontWeight: 'bold' }}>Project:</label>
              <select
                value={projectSlug || ''}
                onChange={(e) => handleProjectSwitch(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  background: 'white',
                  minWidth: 200
                }}
              >
                {projects.map(project => (
                  <option key={project.id} value={project.slug}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentProject && (
            <div style={{
              padding: 16,
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 4
            }}>
              <h3 style={{ margin: '0 0 8px 0' }}>{currentProject.name}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
                Project slug: <code>{currentProject.slug}</code> • 
                Created: {new Date(currentProject.created_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Pages Grid */}
        <div>
          <h3 style={{ marginBottom: 16 }}>Available Pages</h3>
          
          {pages.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 4,
              color: '#666'
            }}>
              No pages available
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16
            }}>
              {pages.map(page => {
                const hasAccess = allowedPages.includes(page.slug);
                
                return (
                  <div
                    key={page.slug}
                    onClick={() => handlePageClick(page.slug)}
                    style={{
                      padding: 20,
                      background: 'white',
                      border: '1px solid #e5e5e5',
                      borderRadius: 4,
                      cursor: hasAccess ? 'pointer' : 'not-allowed',
                      opacity: hasAccess ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (hasAccess) {
                        e.currentTarget.style.borderColor = '#007bff';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,123,255,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasAccess) {
                        e.currentTarget.style.borderColor = '#e5e5e5';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h4 style={{ margin: 0, fontSize: 16 }}>{page.title}</h4>
                      <div style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: 11,
                        background: hasAccess ? '#d4edda' : '#f8d7da',
                        color: hasAccess ? '#155724' : '#721c24'
                      }}>
                        {hasAccess ? 'Accessible' : 'No Access'}
                      </div>
                    </div>
                    
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: 14 }}>
                      <code>{page.slug}</code>
                    </p>
                    
                    {page.is_universal && (
                      <div style={{
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontSize: 11,
                        background: '#e7f3ff',
                        color: '#0066cc',
                        display: 'inline-block'
                      }}>
                        Universal
                      </div>
                    )}
                    
                    {!hasAccess && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255,255,255,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 4
                      }}>
                        <span style={{ fontSize: 12, color: '#666' }}>🔒</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
