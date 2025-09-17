import React from 'react'
import { Link } from 'react-router-dom'
import { handleLogout } from '../utils/auth'

export default function Home() {
  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h1 style={{ margin: 0 }}><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>The Night Ventures</a></h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="btn btn-sm" to="/bva">BvA Test</Link>
              <Link className="btn btn-sm" to="/admin">Admin</Link>
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
      <div style={{ flex: 1, minHeight: 0 }}>
        <iframe
          title="Legacy Home"
          src="/legacy.html"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </main>
  )
}


