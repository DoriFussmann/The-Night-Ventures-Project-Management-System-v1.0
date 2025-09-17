import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Bva from './pages/Bva'
import CsmDashboard from './pages/CsmDashboard'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bva" element={<Bva />} />
        <Route path="/csm-dashboard" element={<CsmDashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}
createRoot(container).render(<App />)