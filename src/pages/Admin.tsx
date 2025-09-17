import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DebugPanel } from '../components/DebugPanel';
import { handleLogout } from '../utils/auth';

interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

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

interface Permission {
  page_slug: string;
  title?: string;
  can_view: boolean;
  can_edit: boolean;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'users' | 'projects' | 'permissions'>('users');
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  
  // Permissions state
  const [pages, setPages] = useState<Page[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [permissionsLoading, setPermissionsLoading] = useState(false);

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

  // Load data functions
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await apiCall('/api/admin/users');
      setUsers(data);
    } catch (e) {
      alert('Failed to load users: ' + String(e));
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await apiCall('/api/admin/projects');
      setProjects(data);
    } catch (e) {
      alert('Failed to load projects: ' + String(e));
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadPages = async () => {
    try {
      const data = await apiCall('/api/admin/pages');
      setPages(data);
    } catch (e) {
      console.error('Failed to load pages:', e);
    }
  };

  const loadPermissions = async () => {
    if (!selectedUserId || !selectedProjectId) {
      setPermissions([]);
      return;
    }
    
    setPermissionsLoading(true);
    try {
      const data = await apiCall(`/api/admin/permissions/${selectedUserId}/${selectedProjectId}`);
      setPermissions(data);
    } catch (e) {
      alert('Failed to load permissions: ' + String(e));
    } finally {
      setPermissionsLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadUsers();
    loadProjects();
    loadPages();
  }, []);

  // Load permissions when user/project selection changes
  useEffect(() => {
    loadPermissions();
  }, [selectedUserId, selectedProjectId]);

  // User management functions
  const handleCreateUser = async () => {
    const email = prompt('Enter user email:');
    if (!email) return;
    
    const name = prompt('Enter user name (optional):') || '';
    const password = prompt('Enter temporary password:');
    if (!password) return;

    try {
      await apiCall('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, name, password }),
      });
      await loadUsers();
    } catch (e) {
      alert('Failed to create user: ' + String(e));
    }
  };

  // Project management functions
  const handleCreateProject = async () => {
    const name = prompt('Enter project name:');
    if (!name) return;

    try {
      await apiCall('/api/admin/projects', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      await loadProjects();
    } catch (e) {
      alert('Failed to create project: ' + String(e));
    }
  };

  // Permission management functions
  const handlePermissionChange = (pageSlug: string, canView: boolean) => {
    setPermissions(prev => prev.map(perm => 
      perm.page_slug === pageSlug 
        ? { ...perm, can_view: canView }
        : perm
    ));
  };

  const handleSavePermissions = async () => {
    if (!selectedUserId || !selectedProjectId) return;

    try {
      await apiCall('/api/admin/permissions/bulk', {
        method: 'PUT',
        body: JSON.stringify({
          user_id: selectedUserId,
          project_id: selectedProjectId,
          permissions: permissions.map(p => ({
            page_slug: p.page_slug,
            can_view: p.can_view,
            can_edit: p.can_edit
          }))
        }),
      });
      alert('Permissions updated successfully!');
    } catch (e) {
      alert('Failed to update permissions: ' + String(e));
    }
  };

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
              <a className="btn btn-sm" href="/admin.html">Legacy Admin</a>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Admin Dashboard</h2>
        </div>

        {/* Tab Navigation */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5' }}>
            {(['users', 'projects', 'permissions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: activeTab === tab ? '#ffffff' : 'transparent',
                  borderBottom: activeTab === tab ? '2px solid #007bff' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontWeight: activeTab === tab ? 'bold' : 'normal'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: 16,
              padding: 12,
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 4
            }}>
              <div>
                <strong>Users:</strong> {usersLoading ? '...' : users.length}
              </div>
              <button onClick={handleCreateUser} style={{ padding: '8px 16px' }}>
                Add User
              </button>
            </div>

            {usersLoading ? (
              <div>Loading users...</div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>Email</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Admin</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: 12, textAlign: 'center', color: '#666' }}>
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map(user => (
                        <tr key={user.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: 12 }}>
                            {user.email}
                          </td>
                          <td style={{ padding: 12 }}>
                            {user.name || 'N/A'}
                          </td>
                          <td style={{ padding: 12 }}>
                            <span style={{ 
                              padding: '2px 6px', 
                              borderRadius: 3, 
                              fontSize: 11,
                              background: user.is_admin ? '#d4edda' : '#f8f9fa',
                              color: user.is_admin ? '#155724' : '#6c757d'
                            }}>
                              {user.is_admin ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td style={{ padding: 12, fontSize: 11, color: '#666' }}>
                            {new Date(user.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: 16,
              padding: 12,
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 4
            }}>
              <div>
                <strong>Projects:</strong> {projectsLoading ? '...' : projects.length}
              </div>
              <button onClick={handleCreateProject} style={{ padding: '8px 16px' }}>
                Add Project
              </button>
            </div>

            {projectsLoading ? (
              <div>Loading projects...</div>
            ) : (
              <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 4 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                      <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Slug</th>
                      <th style={{ textAlign: 'left', padding: 12 }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: 12, textAlign: 'center', color: '#666' }}>
                          No projects found
                        </td>
                      </tr>
                    ) : (
                      projects.map(project => (
                        <tr key={project.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: 12 }}>
                            {project.name}
                          </td>
                          <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 11 }}>
                            {project.slug}
                          </td>
                          <td style={{ padding: 12, fontSize: 11, color: '#666' }}>
                            {new Date(project.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div>
            <div style={{ 
              padding: 16,
              background: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: 4,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>
                    User:
                  </label>
                  <select 
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                  >
                    <option value="">Select a user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.email} ({user.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>
                    Project:
                  </label>
                  <select 
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.slug})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedUserId && selectedProjectId && (
                <button 
                  onClick={handleSavePermissions}
                  style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4 }}
                >
                  Save Permissions
                </button>
              )}
            </div>

            {selectedUserId && selectedProjectId && (
              permissionsLoading ? (
                <div>Loading permissions...</div>
              ) : (
                <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 4 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                        <th style={{ textAlign: 'left', padding: 12 }}>Page</th>
                        <th style={{ textAlign: 'left', padding: 12 }}>View Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {permissions.map(permission => (
                        <tr key={permission.page_slug} style={{ borderBottom: '1px solid #f5f5f5' }}>
                          <td style={{ padding: 12 }}>
                            {permission.title || permission.page_slug}
                          </td>
                          <td style={{ padding: 12 }}>
                            <input
                              type="checkbox"
                              checked={permission.can_view}
                              onChange={(e) => handlePermissionChange(permission.page_slug, e.target.checked)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {!selectedUserId || !selectedProjectId ? (
              <div style={{ 
                padding: 24, 
                textAlign: 'center', 
                color: '#666',
                background: 'white',
                border: '1px solid #e5e5e5',
                borderRadius: 4
              }}>
                Select a user and project to manage permissions
              </div>
            ) : null}
          </div>
        )}

        <DebugPanel />
      </main>
    </div>
  );
}
