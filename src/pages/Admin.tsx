import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import withPageAccess from '../lib/withPageAccess'

function AdminPage() {
  const [user, setUser] = useState(null)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
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
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    status: 'Do',
    project: '',
    dueDate: ''
  })
  
  
  const [pages, setPages] = useState([])
  const [pageAccess, setPageAccess] = useState({})
  
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  
  // Collections state
  const [collections, setCollections] = useState([])
  const [tasksCollection, setTasksCollection] = useState(null)
  
  const [editingUser, setEditingUser] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [editingUpdatesMode, setEditingUpdatesMode] = useState(false)
  const [selectedUpdates, setSelectedUpdates] = useState(new Set())

  // File upload utility
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    return response.json();
  };

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

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to load user:', error)
    }
  }

  // Load users and projects from server on component mount
  useEffect(() => {
    const loadData = async () => {
      // Load current user first
      await loadUser()
      
      try {
        // Load users
        const serverUsers = await apiCall('/api/users');
        setUsers(serverUsers);
      } catch (e) {
        console.error('Error loading users:', e);
        // Show error instead of mock data
        setUsers([]);
      }

      try {
        // Load projects
        const serverProjects = await apiCall('/api/projects');
        setProjects(serverProjects);
      } catch (e) {
        console.error('Error loading projects:', e);
        // Show error instead of mock data
        setProjects([]);
      }

      try {
        // Load collections
        const serverCollections = await apiCall('/api/collections');
        setCollections(serverCollections);
        
        // Find tasks collection
        const tasksCol = serverCollections.find(col => col.slug === 'tasks');
        if (tasksCol) {
          setTasksCollection(tasksCol);
          
          // Load tasks from collections API
          const tasksResponse = await apiCall(`/api/collections/tasks/items`);
          const taskItems = tasksResponse.items || tasksResponse; // Handle both paginated and direct responses
          
          // Transform items to match expected task format
          const transformedTasks = taskItems.map(item => ({
            id: item.id,
            title: item.data.title,
            description: item.data.description,
            status: item.data.status,
            project: item.data.project,
            projectName: item.data.projectName,
            assignee: item.data.assignee,
            dueDate: item.data.dueDate,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          }));
          
          setTasks(transformedTasks);
        } else {
          console.warn('Tasks collection not found');
          setTasks([]);
        }
      } catch (e) {
        console.error('Error loading tasks:', e);
        setTasks([]);
      }

      try {
        // Load pages registry
        const serverPages = await apiCall('/api/pages');
        setPages(serverPages);
        
        // Initialize pageAccess state with all pages set to false
        const initialPageAccess = {};
        serverPages.forEach(page => {
          initialPageAccess[page.slug] = false;
        });
        setPageAccess(initialPageAccess);
      } catch (e) {
        console.error('Error loading pages:', e);
        setPages([]);
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
      // Reset pageAccess to all false based on current pages
      const resetPageAccess = {};
      pages.forEach(page => {
        resetPageAccess[page.slug] = false;
      });
      setPageAccess(resetPageAccess)
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

  // Handle adding a new task
  const handleAddTask = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!taskFormData.title || !taskFormData.status) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Get project name for display
      const selectedProject = projects.find(p => p.id === taskFormData.project)
      
      // Create new task data object for Collections API
      const taskData = {
        title: taskFormData.title,
        description: taskFormData.description,
        status: taskFormData.status,
        project: taskFormData.project,
        projectName: selectedProject ? selectedProject.name : null,
        assignee: taskFormData.assignee || null,
        dueDate: taskFormData.dueDate || null
      }

      // Save to server via Collections API
      const savedItem = await apiCall('/api/collections/tasks/items', {
        method: 'POST',
        body: JSON.stringify({ data: taskData })
      });

      // Transform saved item to match expected task format
      const transformedTask = {
        id: savedItem.id,
        title: savedItem.data.title,
        description: savedItem.data.description,
        status: savedItem.data.status,
        project: savedItem.data.project,
        projectName: savedItem.data.projectName,
        assignee: savedItem.data.assignee,
        dueDate: savedItem.data.dueDate,
        createdAt: savedItem.createdAt,
        updatedAt: savedItem.updatedAt
      };

      // Add task to local state
      setTasks(prev => [...prev, transformedTask])
      
      // Reset form and close modal
      setTaskFormData({
        title: '',
        description: '',
        status: 'Do',
        project: '',
        dueDate: ''
      })
      setShowAddTaskModal(false)
      
      alert(`Task "${transformedTask.title}" has been added successfully!`)
    } catch (e) {
      console.error('Error adding task:', e);
      alert('Failed to add task: ' + e.message);
    }
  }

  // Parse updates string into individual entries
  const parseUpdates = (updatesString) => {
    if (!updatesString) return [];
    return updatesString.split('\n').filter(line => line.trim().length > 0);
  };

  // Convert updates array back to string
  const stringifyUpdates = (updatesArray) => {
    return updatesArray.join('\n');
  };

  // Toggle updates editing mode
  const toggleUpdatesEditMode = () => {
    setEditingUpdatesMode(!editingUpdatesMode);
    setSelectedUpdates(new Set());
  };

  // Toggle update selection
  const toggleUpdateSelection = (index) => {
    const newSelected = new Set(selectedUpdates);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedUpdates(newSelected);
  };

  // Select all updates
  const selectAllUpdates = () => {
    const updates = parseUpdates(editingProject.updates || '');
    const allIndices = new Set(updates.map((_, index) => index));
    setSelectedUpdates(allIndices);
  };

  // Deselect all updates
  const deselectAllUpdates = () => {
    setSelectedUpdates(new Set());
  };

  // Delete selected updates
  const deleteSelectedUpdates = () => {
    if (!editingProject || selectedUpdates.size === 0) return;
    
    const updates = parseUpdates(editingProject.updates);
    const sortedIndices = Array.from(selectedUpdates).sort((a, b) => b - a); // Sort in descending order
    
    // Remove updates from highest index to lowest to maintain correct indices
    sortedIndices.forEach(index => {
      updates.splice(index, 1);
    });
    
    setEditingProject(prev => ({
      ...prev,
      updates: stringifyUpdates(updates)
    }));
    
    setSelectedUpdates(new Set());
  };

  // Handle saving project edits
  const handleSaveProject = async (e) => {
    e.preventDefault()
    
    try {
      const formData = new FormData(e.target)
      const name = formData.get('name')
      const description = formData.get('description')
      const status = formData.get('status')
      const source = formData.get('source')
      const type = formData.get('type')
      const individuals = formData.get('individuals')
      const monthlyImpact = formData.get('monthlyImpact')
      const hoursPerMonth = formData.get('hoursPerMonth')
      const updates = formData.get('updates')
      let imageDataUrl = editingProject.imageDataUrl // Default to existing image
      let logoName = editingProject.logo // Default to existing logo name

      // Process new logo file if uploaded
      if (editingProject._tempFile) {
        // Upload file to server
        const uploadResult = await uploadFile(editingProject._tempFile);
        imageDataUrl = uploadResult.url; // This will be something like "/uploads/filename.jpg"
        logoName = uploadResult.originalName;
      }
      
      const updatedProjectData = {
        name,
        description,
        status,
        source,
        type,
        individuals: individuals ? individuals.split(',').map(i => i.trim()).filter(i => i) : [],
        monthlyImpact: monthlyImpact ? parseFloat(monthlyImpact) : 0,
        hoursPerMonth: hoursPerMonth ? parseFloat(hoursPerMonth) : 0,
        updates: updates || '',
        logo: logoName,
        imageDataUrl: imageDataUrl
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
        updatedPageAccess[page.slug] = formData.get(`page-${page.slug}`) === 'on'
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
        <div className="layout">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
              <Link to="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                {user && user.projectLogo ? (
                  <img 
                    src={user.projectLogo} 
                    alt={user.projectName || 'Project Logo'} 
                    style={{ 
                      height: '24px', 
                      width: 'auto', 
                      maxWidth: '120px',
                      objectFit: 'contain'
                    }} 
                  />
                ) : (
                  <span style={{ fontSize: 16, lineHeight: '24px', fontWeight: 400, color: '#171717' }}>
                    The Night Ventures
                  </span>
                )}
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link className="btn btn-sm" to="/admin">Admin</Link>
              <Link className="btn btn-sm" to="/">Login</Link>
            </div>
          </div>
        </div>
      </header>
      <div style={{ flex: 1, minHeight: 0, padding: 32 }}>
        <div className="layout">
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

            <button 
              className="btn btn-sm"
              onClick={() => setShowAddTaskModal(true)}
            >
              Add Task
                </button>
          </div>

          {/* Users Grid - Collapsible */}
          <div style={{ marginTop: 48 }}>
            <details className="collapsible" style={{ border: '1px solid #e5e5e5', borderRadius: 8, background: '#ffffff' }}>
              <summary style={{
                cursor: 'pointer',
                listStyle: 'none',
                padding: '16px 20px',
                fontSize: 20,
                lineHeight: '28px',
                fontWeight: 500,
                borderBottom: '1px solid #eaeaea',
                position: 'relative',
                paddingRight: '40px',
                color: '#171717'
              }}>
                  Users
              </summary>
              <div className="collapsible-body" style={{ padding: 20 }}>
                  {users.length === 0 ? (
                  <div style={{ 
                    padding: 32, 
                    textAlign: 'center', 
                    color: '#6c757d', 
                    fontSize: 13 
                  }}>
                        No users found
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 12,
                    width: '100%'
                  }}>
                    {users.map(user => (
                      <div
                        key={user.id}
                        onClick={() => setEditingUser(user)}
                        style={{ 
                          background: 'white',
                          border: '1px solid #e5e5e5',
                          borderRadius: 6,
                          padding: '12px 14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#171717',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#f8f9fa';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'white';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {user.firstName} {user.lastName}
                          </div>
                    ))}
                  </div>
                  )}
            </div>
            </details>
          </div>

          {/* Projects Grid - Collapsible */}
          <div style={{ marginTop: 48 }}>
            <details className="collapsible" style={{ border: '1px solid #e5e5e5', borderRadius: 8, background: '#ffffff' }}>
              <summary style={{
                cursor: 'pointer',
                listStyle: 'none',
                padding: '16px 20px',
                fontSize: 20,
                lineHeight: '28px',
                fontWeight: 500,
                borderBottom: '1px solid #eaeaea',
                position: 'relative',
                paddingRight: '40px',
                color: '#171717'
              }}>
              Projects
              </summary>
              <div className="collapsible-body" style={{ padding: 20 }}>
                  {projects.length === 0 ? (
                  <div style={{ 
                    padding: 32, 
                    textAlign: 'center', 
                    color: '#6c757d', 
                    fontSize: 13 
                  }}>
                        No projects found
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 12,
                    width: '100%'
                  }}>
                    {projects.map(project => (
                      <div
                        key={project.id}
                        onClick={() => setEditingProject(project)}
                        style={{ 
                          background: 'white',
                          border: '1px solid #e5e5e5',
                          borderRadius: 6,
                          padding: '12px 14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#171717',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#f8f9fa';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'white';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                          {project.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          </div>

          {/* Tasks Grid - Collapsible */}
          <div style={{ marginTop: 48 }}>
            <details className="collapsible" style={{ border: '1px solid #e5e5e5', borderRadius: 8, background: '#ffffff' }}>
              <summary style={{
                cursor: 'pointer',
                listStyle: 'none',
                padding: '16px 20px',
                fontSize: 20,
                lineHeight: '28px',
                fontWeight: 500,
                borderBottom: '1px solid #eaeaea',
                position: 'relative',
                paddingRight: '40px',
                color: '#171717'
              }}>
                Tasks
              </summary>
              <div className="collapsible-body" style={{ padding: 20 }}>
                {tasks.length === 0 ? (
                  <div style={{ 
                    padding: 32, 
                    textAlign: 'center', 
                    color: '#6c757d', 
                    fontSize: 13 
                  }}>
                    No tasks found
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    width: '100%'
                  }}>
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => setEditingTask(task)}
                            style={{ 
                          background: 'white',
                          border: '1px solid #e5e5e5',
                          borderRadius: 6,
                          padding: '16px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: 13,
                          color: '#171717',
                          minHeight: '80px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#f8f9fa';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'white';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {/* Short Description */}
                        <div style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#171717',
                          lineHeight: '1.3'
                        }}>
                          {task.title}
                        </div>
                        
                        {/* Status */}
                        <div style={{
                          fontSize: 12,
                          color: '#666'
                        }}>
                          <span style={{
                            background: task.status === 'Done' ? '#d4edda' : task.status === 'Doing' ? '#fff3cd' : '#f8d7da',
                            color: task.status === 'Done' ? '#155724' : task.status === 'Doing' ? '#856404' : '#721c24',
                            padding: '2px 6px',
                              borderRadius: 12, 
                              fontSize: 11,
                              fontWeight: 500
                          }}>
                            {task.status}
                          </span>
                        </div>
                        
                        {/* Project Name */}
                        <div style={{
                          fontSize: 12,
                          color: '#666',
                          fontStyle: task.projectName ? 'normal' : 'italic'
                        }}>
                          {task.projectName || 'No project assigned'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            </details>
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
                    <div key={page.slug} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        id={`page-${page.slug}`}
                        checked={pageAccess[page.slug] || false}
                        onChange={(e) => setPageAccess(prev => ({ 
                          ...prev, 
                          [page.slug]: e.target.checked 
                        }))}
                        style={{ marginRight: 8 }}
                      />
                      <label 
                        htmlFor={`page-${page.slug}`}
                            style={{ fontSize: 13, color: '#333', cursor: 'pointer' }}
                      >
                        {page.label}
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
                    <div key={page.slug} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        id={`edit-page-${page.slug}`}
                        name={`page-${page.slug}`}
                        defaultChecked={editingUser.pageAccess?.[page.slug] || false}
                        style={{ marginRight: 8 }}
                      />
                      <label 
                        htmlFor={`edit-page-${page.slug}`}
                            style={{ fontSize: 13, color: '#333', cursor: 'pointer' }}
                      >
                        {page.label}
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
                width: '90vw',
                maxWidth: '1200px',
                maxHeight: '90vh',
                aspectRatio: '16/9',
                overflow: 'auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Edit Project</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    {/* Logo Upload Area - Top Right */}
                    <div 
                      style={{ 
                        position: 'relative',
                        width: 80,
                        height: 80,
                        border: '2px dashed #ddd',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: editingProject.imageDataUrl ? 'transparent' : '#f8f9fa',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => document.getElementById('logo-upload-input').click()}
                      onMouseEnter={(e) => {
                        if (editingProject.imageDataUrl) {
                          e.target.style.opacity = '0.8';
                          const overlay = e.target.querySelector('.logo-overlay');
                          if (overlay) overlay.style.opacity = '1';
                        } else {
                          e.target.style.borderColor = '#007bff';
                          e.target.style.background = '#f0f8ff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (editingProject.imageDataUrl) {
                          e.target.style.opacity = '1';
                          const overlay = e.target.querySelector('.logo-overlay');
                          if (overlay) overlay.style.opacity = '0';
                        } else {
                          e.target.style.borderColor = '#ddd';
                          e.target.style.background = '#f8f9fa';
                        }
                      }}
                    >
                      {editingProject.imageDataUrl ? (
                        <>
                          <img 
                            src={editingProject.imageDataUrl} 
                            alt="Project logo" 
                            style={{ 
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              borderRadius: 6
                            }} 
                          />
                          <div 
                            className="logo-overlay"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: 'rgba(0, 0, 0, 0.7)',
                              borderRadius: 6,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.2s ease',
                              color: 'white',
                              fontSize: 11,
                              fontWeight: 500,
                              textAlign: 'center',
                              padding: 4
                            }}
                          >
                            Click to replace
                          </div>
                        </>
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          color: '#666',
                          fontSize: 11,
                          fontWeight: 500,
                          lineHeight: 1.2
                        }}>
                          Click to upload logo
                        </div>
                      )}
                      <input
                        id="logo-upload-input"
                        type="file"
                        name="logo"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            // Create a temporary preview URL for immediate display
                            const previewUrl = URL.createObjectURL(file);
                            setEditingProject(prev => ({
                              ...prev,
                              imageDataUrl: previewUrl,
                              _tempFile: file // Store file for later upload
                            }));
                          }
                        }}
                      />
                    </div>
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
                </div>

                <form onSubmit={handleSaveProject}>
                  {/* Row 1: Name, Description, Status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  {/* Project Name */}
                    <div>
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
                          boxSizing: 'border-box',
                          height: '44px'
                      }}
                    />
                  </div>

                    {/* Description */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Description
                      </label>
                      <textarea
                        name="description"
                        defaultValue={editingProject.description || ''}
                        rows={1}
                        style={{ 
                          width: '100%', 
                          padding: 12, 
                          border: '1px solid #ddd', 
                          borderRadius: 6,
                          fontSize: 13,
                          boxSizing: 'border-box',
                          resize: 'none',
                          height: '44px'
                        }}
                        placeholder="Enter project description"
                    />
                  </div>

                  {/* Status Dropdown */}
                    <div>
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
                          boxSizing: 'border-box',
                          height: '44px'
                      }}
                    >
                      <option value="">Select status...</option>
                      <option value="Pipeline">Pipeline</option>
                      <option value="Active">Active</option>
                        <option value="Live">Live</option>
                        <option value="Potential">Potential</option>
                        <option value="Lost">Lost</option>
                        <option value="Archived">Archived</option>
                    </select>
                    </div>
                  </div>

                  {/* Row 2: Source, Type, Individuals */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {/* Source */}
                    <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Source
                    </label>
                    <input
                        type="text"
                        name="source"
                        defaultValue={editingProject.source || ''}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                          boxSizing: 'border-box',
                          height: '44px'
                      }}
                        placeholder="e.g., EarlyStageLabs"
                    />
                      </div>

                    {/* Type */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Type
                      </label>
                      <input
                        type="text"
                        name="type"
                        defaultValue={editingProject.type || ''}
                        style={{ 
                          width: '100%', 
                          padding: 12, 
                          border: '1px solid #ddd', 
                          borderRadius: 6,
                          fontSize: 13,
                          boxSizing: 'border-box',
                          height: '44px'
                        }}
                        placeholder="e.g., Fractional CFO"
                      />
                    </div>

                    {/* Individuals */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Individuals (comma-separated)
                      </label>
                      <input
                        type="text"
                        name="individuals"
                        defaultValue={Array.isArray(editingProject.individuals) ? editingProject.individuals.join(', ') : (editingProject.individuals || '')}
                        style={{ 
                          width: '100%', 
                          padding: 12, 
                          border: '1px solid #ddd', 
                          borderRadius: 6,
                          fontSize: 13,
                          boxSizing: 'border-box',
                          height: '44px'
                        }}
                        placeholder="Person 1, Person 2, Person 3"
                      />
                    </div>
                  </div>

                  {/* Row 3: Monthly Impact, Hours Per Month */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {/* Monthly Impact */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Monthly Impact ($)
                      </label>
                      <input
                        type="number"
                        name="monthlyImpact"
                        defaultValue={editingProject.monthlyImpact || 0}
                        style={{ 
                          width: '100%', 
                          padding: 12, 
                          border: '1px solid #ddd', 
                          borderRadius: 6,
                          fontSize: 13,
                          boxSizing: 'border-box',
                          height: '44px'
                        }}
                        placeholder="5000"
                      />
                    </div>

                    {/* Hours Per Month */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                        Hours Per Month
                      </label>
                      <input
                        type="number"
                        name="hoursPerMonth"
                        defaultValue={editingProject.hoursPerMonth || 0}
                        style={{ 
                          width: '100%', 
                          padding: 12, 
                          border: '1px solid #ddd', 
                          borderRadius: 6,
                          fontSize: 13,
                          boxSizing: 'border-box',
                          height: '44px'
                        }}
                        placeholder="20"
                      />
                    </div>
                  </div>

                  {/* Row 4: Updates (full width) */}
                  <div style={{ marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                          Updates
                        </label>
                        <button
                          type="button"
                          onClick={toggleUpdatesEditMode}
                          style={{
                            background: editingUpdatesMode ? '#6c757d' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            padding: '4px 8px',
                            fontSize: 11,
                            cursor: 'pointer'
                          }}
                        >
                          {editingUpdatesMode ? 'Done' : 'Edit'}
                        </button>
                      </div>
                      
                      {/* Bulk Actions (shown when in edit mode) */}
                      {editingUpdatesMode && parseUpdates(editingProject.updates || '').length > 0 && (
                        <div style={{ 
                          display: 'flex', 
                          gap: 8, 
                          marginBottom: 8, 
                          padding: 8, 
                          background: '#e9ecef', 
                          borderRadius: 4,
                          alignItems: 'center'
                        }}>
                          <button
                            type="button"
                            onClick={selectAllUpdates}
                            style={{
                              background: 'transparent',
                              color: '#007bff',
                              border: 'none',
                              fontSize: 11,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={deselectAllUpdates}
                            style={{
                              background: 'transparent',
                              color: '#007bff',
                              border: 'none',
                              fontSize: 11,
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            Deselect All
                          </button>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#666' }}>
                              {selectedUpdates.size} selected
                            </span>
                            {selectedUpdates.size > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${selectedUpdates.size} update(s)?`)) {
                                    deleteSelectedUpdates();
                                  }
                                }}
                                style={{
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: 11,
                                  cursor: 'pointer'
                                }}
                              >
                                Delete Selected
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Updates List */}
                      <div style={{ 
                        border: '1px solid #ddd', 
                        borderRadius: 6, 
                        maxHeight: '300px', 
                        overflowY: 'auto',
                        background: '#f8f9fa'
                      }}>
                        {parseUpdates(editingProject.updates || '').length > 0 ? (
                          parseUpdates(editingProject.updates || '').map((update, index) => (
                            <div key={index} style={{
                              padding: 12,
                              borderBottom: index < parseUpdates(editingProject.updates || '').length - 1 ? '1px solid #e5e5e5' : 'none',
                              background: selectedUpdates.has(index) ? '#e3f2fd' : 'white',
                              margin: '8px',
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 12
                            }}>
                              {/* Checkbox (shown in edit mode) */}
                              {editingUpdatesMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedUpdates.has(index)}
                                  onChange={() => toggleUpdateSelection(index)}
                                  style={{
                                    marginTop: 2,
                                    cursor: 'pointer'
                                  }}
                                />
                              )}
                              
                              {/* Update Content */}
                              <div style={{ 
                                flex: 1, 
                                fontSize: 13, 
                                lineHeight: 1.4,
                                whiteSpace: 'pre-wrap'
                              }}>
                                {update}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ 
                            padding: 20, 
                            textAlign: 'center', 
                            color: '#666', 
                            fontSize: 13 
                          }}>
                            No updates yet
                          </div>
                        )}
                      </div>

                      {/* Hidden input to maintain form compatibility */}
                      <input
                        type="hidden"
                        name="updates"
                        value={editingProject.updates || ''}
                      />
                    </div>
                  </div>

                  {/* Created/Updated Info */}
                  <div style={{ marginBottom: 24, padding: 12, background: '#f8f9fa', borderRadius: 6 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      <strong>Created:</strong> {editingProject.createdAt ? new Date(editingProject.createdAt).toLocaleString() : 'Unknown'}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      <strong>Updated:</strong> {editingProject.updatedAt ? new Date(editingProject.updatedAt).toLocaleString() : 'Unknown'}
                    </div>
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

          {/* Add Task Modal */}
          {showAddTaskModal && (
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
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Add New Task</h3>
                  <button 
                    onClick={() => setShowAddTaskModal(false)}
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

                <form onSubmit={handleAddTask}>
                  {/* Project Dropdown */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Project
                    </label>
                    <select
                      value={taskFormData.project}
                      onChange={(e) => setTaskFormData(prev => ({ ...prev, project: e.target.value }))}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        height: '44px'
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

                  {/* Short Description (Title) */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Short Description *
                    </label>
                    <input
                      type="text"
                      value={taskFormData.title}
                      onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        height: '44px'
                      }}
                      placeholder="Enter task title"
                      required
                    />
                  </div>

                  {/* Long Description */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Long Description
                    </label>
                    <textarea
                      value={taskFormData.description}
                      onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                      placeholder="Enter detailed task description (optional)"
                    />
                  </div>

                  {/* Deadline */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={taskFormData.dueDate}
                      onChange={(e) => setTaskFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        height: '44px'
                      }}
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#333' }}>
                      Status *
                    </label>
                    <select
                      value={taskFormData.status}
                      onChange={(e) => setTaskFormData(prev => ({ ...prev, status: e.target.value }))}
                      style={{ 
                        width: '100%', 
                        padding: 12, 
                        border: '1px solid #ddd', 
                        borderRadius: 6,
                        fontSize: 13,
                        boxSizing: 'border-box',
                        height: '44px'
                      }}
                      required
                    >
                      <option value="Do">Do</option>
                      <option value="Doing">Doing</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button 
                      type="button"
                      onClick={() => setShowAddTaskModal(false)}
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
                      Add Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      )
    }

export default withPageAccess(AdminPage, 'admin');
