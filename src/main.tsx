import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Bva from './pages/Bva'
import Admin from './pages/Admin'
import Workspace from './pages/Workspace'
import PageView from './pages/PageView'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/bva" element={<Bva />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/app/:projectSlug" element={<Workspace />} />
        <Route path="/app/:projectSlug/:pageSlug" element={<PageView />} />
        <Route
          path="*"
          element={
            <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
              <h1 style={{ marginBottom: 12 }}>Not Found</h1>
              <Link to="/">Go Home</Link>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}
createRoot(container).render(<App />)


