import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setShowLoginModal(false); // Hide login modal if user is already logged in
          
          // Load projects and tasks if user is superadmin
          if (userData.isSuperadmin) {
            loadProjects();
            loadTasks();
          }
        }
      } catch (e) {
        console.log('Not logged in');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  // Load projects for superadmin users
  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects', {
        credentials: 'include'
      });
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  // Load tasks for superadmin users
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks', {
        credentials: 'include'
      });
      if (response.ok) {
        const tasksData = await response.json();
        setTasks(tasksData);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
  };

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setShowLoginModal(false);
        setEmail('');
        setPassword('');
        
        // Load projects and tasks if user is superadmin
        if (userData.isSuperadmin) {
          loadProjects();
          loadTasks();
        }
        
        alert(`Welcome back, ${userData.firstName}!`);
      } else {
        const error = await response.json();
        alert(error.error || 'Login failed');
      }
    } catch (e) {
      console.error('Login error:', e);
      alert('Login failed. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  if (isLoading) {
    return (
      <main style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', paddingTop: 16, paddingBottom: 16 }}>
        <div className="layout">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 400, color: '#171717' }}>
              <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>The Night Ventures</a>
            </h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {user && user.isSuperadmin && (
                    <Link className="btn btn-sm" to="/admin">Admin</Link>
                  )}
                  {user ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, color: '#171717' }}>
                        Hey, {user.firstName}
                      </span>
                      <button 
                        className="btn btn-sm" 
                        onClick={handleLogout}
                        style={{ fontSize: 12, padding: '4px 8px' }}
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-sm" 
                      onClick={() => setShowLoginModal(true)}
                    >
                      Login
                    </button>
                  )}
                </div>
          </div>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingTop: 40, position: 'relative' }}>
        {user ? (
          <>
            {/* Projects Grid - Only for Superadmins */}
            {user.isSuperadmin && projects.length > 0 && (
              <div style={{
                width: '100%',
                background: 'white',
                borderBottom: '1px solid #e5e5e5',
                padding: '24px 0',
                position: 'relative',
                zIndex: 1
              }}>
                <div className="layout">
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 16,
                    width: '100%',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}>
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e5e5e5',
                          borderRadius: 8,
                          padding: 16,
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          aspectRatio: '1/0.45',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          boxSizing: 'border-box',
                          minWidth: 0,
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {/* Gray square container for logo */}
                        <div style={{
                          aspectRatio: '1/1',
                          background: '#f8f9fa',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: '0 0 auto'
                        }}>
                          {project.imageDataUrl ? (
                            <img
                              src={project.imageDataUrl}
                              alt={`${project.name} logo`}
                              style={{
                                maxWidth: '80%',
                                maxHeight: '80%',
                                width: 'auto',
                                height: 'auto',
                                borderRadius: 4,
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <div style={{
                              fontSize: 24,
                              fontWeight: 600,
                              color: '#6c757d'
                            }}>
                              {project.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* Project Name */}
                        <div style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#171717',
                          lineHeight: '1.3',
                          textAlign: 'left',
                          flex: '0 0 auto'
                        }}>
                          {project.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Task Board - Only for Superadmins */}
            {user.isSuperadmin && (
              <div style={{
                width: '100%',
                background: 'white',
                padding: '40px 0'
              }}>
                <div className="layout">
                  <h2 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 32px 0', color: '#171717', textAlign: 'center' }}>
                    Task Board
                  </h2>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 24,
                    maxWidth: '100%',
                    overflow: 'hidden'
                  }}>
                    {/* Do Column */}
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      padding: 20,
                      minHeight: 400
                    }}>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 500,
                        margin: '0 0 20px 0',
                        color: '#171717',
                        textAlign: 'center',
                        padding: '12px',
                        background: '#fff3cd',
                        borderRadius: 6,
                        border: '1px solid #ffeaa7'
                      }}>
                        Do
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {tasks.filter(task => task.status === 'Do').map(task => (
                          <div
                            key={task.id}
                            style={{
                              background: 'white',
                              border: '1px solid #e5e5e5',
                              borderRadius: 6,
                              padding: 12,
                              fontSize: 13,
                              color: '#171717',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                              {task.title}
                            </div>
                            {task.projectName && (
                              <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                                {task.projectName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Doing Column */}
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      padding: 20,
                      minHeight: 400
                    }}>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 500,
                        margin: '0 0 20px 0',
                        color: '#171717',
                        textAlign: 'center',
                        padding: '12px',
                        background: '#cce5ff',
                        borderRadius: 6,
                        border: '1px solid #74b9ff'
                      }}>
                        Doing
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {tasks.filter(task => task.status === 'Doing').map(task => (
                          <div
                            key={task.id}
                            style={{
                              background: 'white',
                              border: '1px solid #e5e5e5',
                              borderRadius: 6,
                              padding: 12,
                              fontSize: 13,
                              color: '#171717',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                              {task.title}
                            </div>
                            {task.projectName && (
                              <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                                {task.projectName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Done Column */}
                    <div style={{
                      background: '#f8f9fa',
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      padding: 20,
                      minHeight: 400
                    }}>
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 500,
                        margin: '0 0 20px 0',
                        color: '#171717',
                        textAlign: 'center',
                        padding: '12px',
                        background: '#d4edda',
                        borderRadius: 6,
                        border: '1px solid #00b894'
                      }}>
                        Done
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {tasks.filter(task => task.status === 'Done').map(task => (
                          <div
                            key={task.id}
                            style={{
                              background: 'white',
                              border: '1px solid #e5e5e5',
                              borderRadius: 6,
                              padding: 12,
                              fontSize: 13,
                              color: '#171717',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                              {task.title}
                            </div>
                            {task.projectName && (
                              <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                                {task.projectName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Details and Navigation Container - Hidden for Superadmins */}
            {!user.isSuperadmin && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                gap: 24,
                width: '100%',
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 40,
                position: 'relative',
                zIndex: 2
              }}>
                {/* User Details Window */}
                <div style={{ 
                  background: 'white', 
                  border: '1px solid #e5e5e5', 
                  borderRadius: 12, 
                  padding: 32, 
                  width: '100%',
                  maxWidth: 500,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 500, margin: '0 0 8px 0', color: '#171717' }}>
                    Welcome back!
                  </h2>
                  <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
                    Here are your account details
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Name */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f3f4' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Name:</span>
                    <span style={{ fontSize: 13, color: '#171717' }}>{user.firstName} {user.lastName}</span>
                  </div>

                  {/* Email */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f3f4' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Email:</span>
                    <span style={{ fontSize: 13, color: '#171717' }}>{user.email}</span>
                  </div>

                  {/* Project Logo - Centered */}
                  {user.projectName && user.projectName !== 'No project assigned' && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      padding: '20px 0 10px 0'
                    }}>
                      {user.projectLogo ? (
                        <img 
                          src={user.projectLogo} 
                          alt={`${user.projectName} logo`}
                          style={{
                            maxWidth: '90%',
                            maxHeight: '120px',
                            width: 'auto',
                            height: 'auto',
                            borderRadius: 8,
                            objectFit: 'contain',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '200px',
                          height: '80px',
                          background: '#f8f9fa',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 32,
                          fontWeight: 600,
                          color: '#666',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}>
                          {user.projectName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Page Access Navigation Buttons */}
              {user.pageAccess && (
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  width: '100%',
                  maxWidth: 500,
                  flexWrap: 'wrap'
                }}>
                  {Object.entries(user.pageAccess).map(([pageId, hasAccess]) => {
                    if (!hasAccess) return null;
                    
                    // Only show Admin page for superadmins
                    if (pageId === 'admin' && !user.isSuperadmin) return null;
                    
                    const pageConfig = {
                      home: { name: 'Home', path: '/' },
                      bva: { name: 'BvA Dashboard', path: '/bva' },
                      csm: { name: 'CSM Dashboard', path: '/csm-dashboard' },
                      admin: { name: 'Admin', path: '/admin' }
                    };
                    
                    const config = pageConfig[pageId];
                    if (!config) return null;
                    
                    return (
                      <Link
                        key={pageId}
                        to={config.path}
                        className="btn btn-sm"
                        style={{
                          flex: 1,
                          textDecoration: 'none',
                          textAlign: 'center',
                          fontSize: 12,
                          padding: '4px 8px',
                          minHeight: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {config.name}
                      </Link>
                    );
                  })}
                </div>
              )}
              </div>
            )}
          </>
        ) : (
          // Empty state when not logged in
          <div style={{ textAlign: 'center', padding: 32 }}>
            {/* Content removed - user needs to login to see anything */}
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && !user && !isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: 32,
            borderRadius: 8,
            minWidth: 320,
            maxWidth: 400,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Login</h3>
              <button 
                onClick={() => setShowLoginModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: 24, 
                  cursor: 'pointer',
                  padding: 4,
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

                <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your email"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#333' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter your password"
                />
              </div>

              <button 
                type="submit"
                style={{ 
                  width: '100%',
                  padding: 12, 
                  background: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Login
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}