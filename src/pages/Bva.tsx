import React, { useEffect, useMemo, useState } from 'react'

type Row = Record<string, string>

function parseCSV(text: string) {
  const lines = text.trim().split(/\r?\n/)
  const headerLine = lines.shift() || ''
  const headers = headerLine.split(',').map(h => h.trim())
  const rows: Row[] = lines.map(line => {
    const cells = line.split(',')
    const obj: Row = {}
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? '').trim()
    })
    return obj
  })
  return { headers, rows }
}

export default function Bva() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ headers: string[]; rows: Row[] } | null>(null)

  const url = import.meta.env.VITE_SHEET_CSV_URL as string | undefined

  useEffect(() => {
    async function run() {
      if (!url) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const noCacheUrl = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`
        const res = await fetch(noCacheUrl, { headers: { 'Cache-Control': 'no-cache' } })
        if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`)
        const csv = await res.text()
        setData(parseCSV(csv))
        setError(null)
      } catch (e: any) {
        setError(e?.message || 'Failed to load CSV')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [url])

  return (
    <>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h1 style={{ margin: 0 }}>The Night Ventures</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <a className="btn btn-sm" href="/bva">BvA Test</a>
              <a className="btn btn-sm" href="/probability-map.html">Probability Map</a>
              <a className="btn btn-sm" href="/admin.html">Admin</a>
            </div>
          </nav>
        </div>
      </header>
      <main className="layout" style={{ paddingTop: 24, paddingBottom: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h2 style={{ fontSize: 20, lineHeight: '28px', marginBottom: 8 }}>BvA (Google Sheets Demo)</h2>
        {!url ? (
          <div style={{
            padding: 16,
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 8,
            color: '#92400E',
            maxWidth: 640,
          }}>
            <strong>Missing config:</strong> Set <code>VITE_SHEET_CSV_URL</code> in <code>.env</code>, e.g.:<br />
            <code>VITE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/…/export?format=csv&amp;gid=…</code>
          </div>
        ) : loading ? (
          <div>Loading…</div>
        ) : error ? (
          <div style={{ color: '#b91c1c' }}>{error}</div>
        ) : data ? (
          <div>
            <div style={{ margin: '12px 0' }}>
              <strong>Rows loaded:</strong> {data.rows.length}
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    {data.headers.map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, idx) => (
                    <tr key={idx}>
                      {data.headers.map(h => (
                        <td key={h} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas', fontSize: 13 }}>
                          {r[h] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <section style={{ marginTop: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
                {[
                  { label: 'Income', value: '$1,245,000' },
                  { label: 'Gross Profit', value: '$720,300' },
                  { label: 'EBITDA', value: '$312,450' },
                  { label: 'Change in Cash', value: '$98,120' },
                ].map(card => (
                  <div key={card.label} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                    <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 22 }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ marginTop: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                {['Income by Month', 'Gross Profit %', 'EBITDA Trend'].map(title => (
                  <div key={title} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                    <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>{title}</div>
                    <div style={{ height: 200, background: '#fafafa', border: '1px dashed #e5e7eb', borderRadius: 6 }} />
                  </div>
                ))}
              </div>
            </section>
            <section style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                {['Cash Balance', 'Operating Expenses', 'AR/AP'].map(title => (
                  <div key={title} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                    <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>{title}</div>
                    <div style={{ height: 200, background: '#fafafa', border: '1px dashed #e5e7eb', borderRadius: 6 }} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </>
  )
}


