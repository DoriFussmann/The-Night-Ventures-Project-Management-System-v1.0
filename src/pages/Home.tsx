import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState(null)
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
        }
      } catch (e) {
        console.log('Not logged in');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

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
        <div style={{ maxWidth: 1120, marginLeft: 'auto', marginRight: 'auto', paddingLeft: 16, paddingRight: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 400, color: '#171717' }}>
              <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>The Night Ventures</a>
            </h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link className="btn btn-sm" to="/admin">Admin</Link>
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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80, position: 'relative' }}>
        {user ? (
          <>

            {/* User Details and Navigation Container */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 24,
              maxWidth: 600,
              width: '100%'
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

                  {/* Project */}
                  {user.projectName && user.projectName !== 'No project assigned' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f3f4' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Project:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Project Logo */}
                        {user.projectLogo ? (
                          <img 
                            src={user.projectLogo} 
                            alt={`${user.projectName} logo`}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 4,
                              objectFit: 'cover'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 24,
                            height: 24,
                            background: '#f8f9fa',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#666'
                          }}>
                            {user.projectName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: 13, color: '#171717' }}>{user.projectName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Page Access Navigation Boxes */}
              {user.pageAccess && (
                <div style={{ 
                  display: 'flex', 
                  gap: 16, 
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  width: '100%'
                }}>
                  {Object.entries(user.pageAccess).map(([pageId, hasAccess]) => {
                    if (!hasAccess) return null;
                    
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
                        style={{
                          textDecoration: 'none',
                          background: 'white',
                          border: '1px solid #e5e5e5',
                          borderRadius: 12,
                          padding: '20px',
                          minWidth: 140,
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          display: 'block'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                      >
                        <div style={{ 
                          fontSize: 14, 
                          fontWeight: 500, 
                          color: '#171717',
                          lineHeight: '1.2'
                        }}>
                          {config.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          // Welcome Message (when not logged in)
          <div style={{ textAlign: 'center', padding: 32 }}>
            <h1 style={{ fontSize: 48, fontWeight: 300, margin: '0 0 16px 0', color: '#171717' }}>
              The Night Ventures
            </h1>
            <p style={{ fontSize: 18, color: '#525252', margin: '0 0 32px 0' }}>
              Welcome to our project management platform
            </p>
            <Link 
              className="btn" 
              to="/bva"
              style={{ 
                padding: '12px 24px', 
                fontSize: 16,
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              View BvA Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
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