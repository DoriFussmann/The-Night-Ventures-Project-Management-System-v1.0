import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Admin() {
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    project: '',
    isSuperadmin: false
  })
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    status: '',
    logo: null
  })
  
  // Mock data for pages
  const mockProjects = [
    { id: '1', name: 'Project Alpha', status: 'Active' },
    { id: '2', name: 'Project Beta', status: 'Pipeline' },
    { id: '3', name: 'Demo Project', status: 'Active' }
  ]
  
  const pages = [
    { id: 'home', name: 'Home' },
    { id: 'bva', name: 'BvA Dashboard' },
    { id: 'csm', name: 'CSM Dashboard' },
    { id: 'admin', name: 'Admin' }
  ]
  
  const [pageAccess, setPageAccess] = useState({
    home: false,
    bva: false,
    csm: false,
    admin: false
  })
  
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  
  const [editingUser, setEditingUser] = useState(null)
  const [editingProject, setEditingProject] = useState(null)

  // API helper function
  const apiCall = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  };

  // Load users and projects from server on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load users
        const serverUsers = await apiCall('/api/users');
        setUsers(serverUsers);
      } catch (e) {
        console.error('Error loading users:', e);
        // If server fails, use default mock data
        setUsers([
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            password: 'password123',
            project: '1',
            projectName: 'Project Alpha',
            pageAccess: { home: true, bva: true, admin: false }
          },
          {
            id: '2',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            password: 'securepass',
            project: '2',
            projectName: 'Project Beta',
            pageAccess: { home: true, bva: false, admin: true }
          },
          {
            id: '3',
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@example.com',
            password: 'mypassword',
            project: '3',
            projectName: 'Demo Project',
            pageAccess: { home: true, bva: true, admin: true }
          }
        ]);
      }

      try {
        // Load projects
        const serverProjects = await apiCall('/api/projects');
        setProjects(serverProjects);
      } catch (e) {
        console.error('Error loading projects:', e);
        // If server fails, use default mock data
        setProjects(mockProjects);
      }
    };
    
    loadData();
  }, []);

  // Handle adding a new user
  const handleAddUser = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!userFormData.firstName || !userFormData.lastName || !userFormData.email || !userFormData.password || !userFormData.project) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Get project name for display
      const selectedProject = projects.find(p => p.id === userFormData.project)
      
      // Create new user object
      const newUserData = {
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        email: userFormData.email,
        password: userFormData.password,
        project: userFormData.project,
        projectName: selectedProject ? selectedProject.name : 'Unknown Project',
        pageAccess: { ...pageAccess },
        isSuperadmin: userFormData.isSuperadmin
      }

      // Save to server
      const savedUser = await apiCall('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUserData)
      });

      // Add user to local state
      setUsers(prev => [...prev, savedUser])
      
      // Reset form and close modal
      setUserFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        project: '',
        isSuperadmin: false
      })
      setPageAccess({
        home: false,
        bva: false,
        csm: false,
        admin: false
      })
      setShowAddUserModal(false)
      
      alert(`User ${savedUser.firstName} ${savedUser.lastName} has been added successfully!`)
    } catch (e) {
      console.error('Error adding user:', e);
      alert('Failed to add user: ' + e.message);
    }
  }

  // Handle adding a new project
  const handleAddProject = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!projectFormData.name || !projectFormData.status) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Create new project object
      const newProjectData = {
        name: projectFormData.name,
        status: projectFormData.status,
        logo: projectFormData.logo // For now, just store the filename or null
      }

      // Save to server
      const savedProject = await apiCall('/api/projects', {
        method: 'POST',
        body: JSON.stringify(newProjectData)
      });

      // Add project to local state
      setProjects(prev => [...prev, savedProject])
      
      // Reset form and close modal
      setProjectFormData({
        name: '',
        status: '',
        logo: null
      })
      setShowAddProjectModal(false)
      
      alert(`Project ${savedProject.name} has been added successfully!`)
    } catch (e) {
      console.error('Error adding project:', e);
      alert('Failed to add project: ' + e.message);
    }
  }

  // Handle saving project edits
  const handleSaveProject = async (e) => {
    e.preventDefault()
    
    try {
      const formData = new FormData(e.target)
      const name = formData.get('name')
      const status = formData.get('status')
      const logoFile = formData.get('logo')
      
      const updatedProjectData = {
        name,
        status,
        logo: logoFile && logoFile.size > 0 ? logoFile.name : editingProject.logo
      }

      // Save to server
      const savedProject = await apiCall(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedProjectData)
      });

      // Update the project in the local state
      setProjects(prev => prev.map(project => 
        project.id === editingProject.id ? savedProject : project
      ))
      
      // Close modal and show success message
      setEditingProject(null)
      alert(`Project ${name} has been updated successfully!`)
    } catch (e) {
      console.error('Error updating project:', e);
      alert('Failed to update project: ' + e.message);
    }
  }

  // Handle saving user edits
  const handleSaveUser = async (e) => {
    e.preventDefault()
    
    try {
      const formData = new FormData(e.target)
      const firstName = formData.get('firstName')
      const lastName = formData.get('lastName')
      const email = formData.get('email')
      const password = formData.get('password')
      const project = formData.get('project')
      const isSuperadmin = formData.get('isSuperadmin') === 'on'
      
      // Get updated page access from checkboxes
      const updatedPageAccess = {}
      pages.forEach(page => {
        updatedPageAccess[page.id] = formData.get(`page-${page.id}`) === 'on'
      })
      
      // Get project name for display
      const selectedProject = projects.find(p => p.id === project)
      
      const updatedUserData = {
        firstName,
        lastName,
        email,
        password,
        project,
        projectName: selectedProject ? selectedProject.name : 'Unknown Project',
        pageAccess: updatedPageAccess,
        isSuperadmin
      }

      // Save to server
      const savedUser = await apiCall(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedUserData)
      });

      // Update the user in the local state
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? savedUser : user
      ))
      
      // Close modal and show success message
      setEditingUser(null)
      alert(`User ${firstName} ${lastName} has been updated successfully!`)
    } catch (e) {
      console.error('Error updating user:', e);
      alert('Failed to update user: ' + e.message);
    }
  }
  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff', paddingTop: 16, paddingBottom: 16 }}>
        <div style={{ maxWidth: 1120, marginLeft: 'auto', marginRight: 'auto', paddingLeft: 16, paddingRight: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 16, lineHeight: '24px', fontWeight: 400, color: '#171717' }}>
              <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>The Night Ventures</Link>
            </h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link className="btn btn-sm" to="/admin">Admin</Link>
              <Link className="btn btn-sm" to="/">Login</Link>
            </div>
          </div>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0, padding: 32 }}>
        <div style={{ maxWidth: 1120, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-sm"
              onClick={() => setShowAddUserModal(true)}
            >
              Add User
            </button>
            
                <button 
                  className="btn btn-sm"
                  onClick={() => setShowAddProjectModal(true)}
                >
                  Add Project
                </button>
          </div>

          {/* Users Table */}
          <div style={{ marginTop: 48 }}>
                <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 24px 0', color: '#171717' }}>
                  Users
                </h2>
            
            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                        <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                          Name
                        </th>
                        <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                          Email
                        </th>
                        <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                          Password
                        </th>
                        <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                          Project
                        </th>
                        <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                          Page Access
                        </th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#6c757d', fontSize: 13 }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr 
                        key={user.id}
                        onClick={() => setEditingUser(user)}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13 }}>
                          {user.firstName} {user.lastName}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13 }}>
                          {user.email}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13, fontFamily: 'monospace' }}>
                          {user.password}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13 }}>
                          {user.projectName}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {Object.entries(user.pageAccess).map(([pageId, hasAccess]) => {
                              const pageName = pages.find(p => p.id === pageId)?.name || pageId;
                              return hasAccess ? (
                                <span 
                                  key={pageId}
                                  style={{ 
                                    background: '#d4edda', 
                                    color: '#155724', 
                                    padding: '2px 8px', 
                                    borderRadius: 12, 
                                    fontSize: 11,
                                    fontWeight: 500
                                  }}
                                >
                                  {pageName}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Projects Table */}
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 500, margin: '0 0 24px 0', color: '#171717' }}>
              Projects
            </h2>
            
            <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                      Name
                    </th>
                    <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                      Status
                    </th>
                    <th style={{ textAlign: 'left', padding: 16, fontSize: 13, fontWeight: 600, color: '#495057', borderBottom: '1px solid #e5e5e5' }}>
                      Logo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: 32, textAlign: 'center', color: '#6c757d', fontSize: 13 }}>
                        No projects found
                      </td>
                    </tr>
                  ) : (
                    projects.map(project => (
                      <tr 
                        key={project.id}
                        onClick={() => setEditingProject(project)}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13 }}>
                          {project.name}
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13 }}>
                          <span 
                            style={{ 
                              background: project.status === 'Active' ? '#d4edda' : '#fff3cd', 
                              color: project.status === 'Active' ? '#155724' : '#856404', 
                              padding: '2px 8px', 
                              borderRadius: 12, 
                              fontSize: 11,
                              fontWeight: 500
                            }}
                          >
                            {project.status}
                          </span>
                        </td>
                        <td style={{ padding: 16, borderBottom: '1px solid #f1f3f4', fontSize: 13 }}>
                          {project.logo ? project.logo : 'No logo'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
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
            minWidth: 500,
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Add New User</h3>
              <button 
                onClick={() => setShowAddUserModal(false)}
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

            <form onSubmit={handleAddUser}>
              {/* First Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={userFormData.firstName}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={userFormData.lastName}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter last name"
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter email address"
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Password
                </label>
                <input
                  type="text"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  placeholder="Enter password"
                />
              </div>

              {/* Project Dropdown */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Project
                </label>
                <select
                  value={userFormData.project}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, project: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Superadmin Checkbox */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  <input
                    type="checkbox"
                    checked={userFormData.isSuperadmin}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, isSuperadmin: e.target.checked }))}
                  />
                  Superadmin
                </label>
              </div>

              {/* Page Access */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 12, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Page Access
                </label>
                <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 16 }}>
                  {pages.map(page => (
                    <div key={page.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        id={`page-${page.id}`}
                        checked={pageAccess[page.id as keyof typeof pageAccess]}
                        onChange={(e) => setPageAccess(prev => ({ 
                          ...prev, 
                          [page.id]: e.target.checked 
                        }))}
                        style={{ marginRight: 8 }}
                      />
                      <label 
                        htmlFor={`page-${page.id}`}
                            style={{ fontSize: 13, color: '#333', cursor: 'pointer' }}
                      >
                        {page.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button 
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#6c757d', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ 
                    padding: '10px 20px', 
                    background: '#007bff', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
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
            minWidth: 500,
            maxWidth: 600,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Edit User</h3>
              <button 
                onClick={() => setEditingUser(null)}
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

            <form onSubmit={handleSaveUser}>
              {/* First Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  defaultValue={editingUser.firstName}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Last Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  defaultValue={editingUser.lastName}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingUser.email}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Password
                </label>
                <input
                  type="text"
                  name="password"
                  defaultValue={editingUser.password}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Project Dropdown */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Project
                </label>
                <select
                  name="project"
                  defaultValue={editingUser.project}
                  style={{ 
                    width: '100%', 
                    padding: 12, 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select a project...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Superadmin Checkbox */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  <input
                    type="checkbox"
                    name="isSuperadmin"
                    defaultChecked={editingUser.isSuperadmin || false}
                  />
                  Superadmin
                </label>
              </div>

              {/* Page Access */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 12, fontSize: 13, fontWeight: 500, color: '#333' }}>
                  Page Access
                </label>
                <div style={{ border: '1px solid #ddd', borderRadius: 6, padding: 16 }}>
                  {pages.map(page => (
                    <div key={page.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        id={`edit-page-${page.id}`}
                        name={`page-${page.id}`}
                        defaultChecked={editingUser.pageAccess?.[page.id] || false}
                        style={{ marginRight: 8 }}
                      />
                      <label 
                        htmlFor={`edit-page-${page.id}`}
                            style={{ fontSize: 13, color: '#333', cursor: 'pointer' }}
                      >
                        {page.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                <button 
                  type="button"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${editingUser.firstName} ${editingUser.lastName}?`)) {
                      try {
                        await apiCall(`/api/users/${editingUser.id}`, {
                          method: 'DELETE'
                        });
                        setUsers(prev => prev.filter(u => u.id !== editingUser.id));
                        setEditingUser(null);
                        alert('User deleted successfully!');
                      } catch (e) {
                        console.error('Error deleting user:', e);
                        alert('Failed to delete user: ' + e.message);
                      }
                    }
                  }}
                  style={{ 
                    padding: '10px 20px', 
                    background: '#dc3545', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Delete User
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)}
                    style={{ 
                      padding: '10px 20px', 
                      background: '#6c757d', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    style={{ 
                      padding: '10px 20px', 
                      background: '#007bff', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer'
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
          )}

          {/* Add Project Modal */}
          {showAddProjectModal && (
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
                minWidth: 400,
                maxWidth: 500,
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Add New Project</h3>
                  <button 
                    onClick={() => setShowAddProjectModal(false)}
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

                <form onSubmit={handleAddProject}>
                  {/* Project Name */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={projectFormData.name}
                      onChange={(e) => setProjectFormData(prev => ({ ...prev, name: e.target.value }))}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                      placeholder="Enter project name"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Status
                    </label>
                    <select
                      value={projectFormData.status}
                      onChange={(e) => setProjectFormData(prev => ({ ...prev, status: e.target.value }))}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select status...</option>
                      <option value="Pipeline">Pipeline</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>

                  {/* Upload Logo */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Upload Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProjectFormData(prev => ({ ...prev, logo: e.target.files[0] }))}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button 
                      type="button"
                      onClick={() => setShowAddProjectModal(false)}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#6c757d', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      style={{ 
                        padding: '10px 20px', 
                        background: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      Add Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Project Modal */}
          {editingProject && (
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
                minWidth: 400,
                maxWidth: 500,
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Edit Project</h3>
                  <button 
                    onClick={() => setEditingProject(null)}
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

                <form onSubmit={handleSaveProject}>
                  {/* Project Name */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingProject.name}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Status
                    </label>
                    <select
                      name="status"
                      defaultValue={editingProject.status}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Select status...</option>
                      <option value="Pipeline">Pipeline</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>

                  {/* Upload Logo */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Upload Logo
                    </label>
                    <input
                      type="file"
                      name="logo"
                      accept="image/*"
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                    />
                    {editingProject.logo && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                        Current logo: {editingProject.logo}
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                    <button 
                      type="button"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete ${editingProject.name}?`)) {
                          try {
                            await apiCall(`/api/projects/${editingProject.id}`, {
                              method: 'DELETE'
                            });
                            setProjects(prev => prev.filter(p => p.id !== editingProject.id));
                            setEditingProject(null);
                            alert('Project deleted successfully!');
                          } catch (e) {
                            console.error('Error deleting project:', e);
                            alert('Failed to delete project: ' + e.message);
                          }
                        }
                      }}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: 6,
                        fontSize: 13,
                        cursor: 'pointer'
                      }}
                    >
                      Delete Project
                    </button>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button 
                        type="button"
                        onClick={() => setEditingProject(null)}
                        style={{ 
                          padding: '10px 20px', 
                          background: '#6c757d', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 6,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        style={{ 
                          padding: '10px 20px', 
                          background: '#007bff', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 6,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      )
    }
