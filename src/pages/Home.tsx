import React from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h1 style={{ margin: 0 }}><a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>The Night Ventures</a></h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <a className="btn btn-sm" href="/bva">BvA Test</a>
              <a className="btn btn-sm" href="/probability-map.html">Probability Map</a>
              <a className="btn btn-sm" href="/admin.html">Admin</a>
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


