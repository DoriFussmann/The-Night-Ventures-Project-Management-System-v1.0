import React, { useEffect, useMemo, useState } from 'react'
import withPageAccess from '../lib/withPageAccess'

type Row = Record<string, string>

function parseCSV(text: string) {
  const out: string[][] = []
  let field = ''
  let record: string[] = []
  let inQuotes = false
  const pushField = () => { record.push(field); field = '' }
  const pushRecord = () => { out.push(record); record = [] }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1]
        if (next === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        pushField()
      } else if (ch === '\n') {
        pushField(); pushRecord()
      } else if (ch === '\r') {
        // ignore
      } else {
        field += ch
      }
    }
  }
  // flush last field/record if not already
  pushField(); if (record.length) pushRecord()

  if (out.length === 0) return { headers: [], rows: [] }
  const headers = (out.shift() || []).map(h => h.trim())
  const rows: Row[] = out.map(cells => {
    const obj: Row = {}
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim() })
    return obj
  })
  return { headers, rows }
}

function BvaPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{ headers: string[]; rows: Row[] } | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')

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

  const periodKey = useMemo(() => data?.headers.find(h => h.toLowerCase() === 'period') ?? null, [data])
  const clientIdKey = useMemo(() => data?.headers.find(h => h.toLowerCase() === 'client_id') ?? null, [data])
  const periodOptions = useMemo(() => {
    if (!data || !periodKey) return [] as string[]
    const set = new Set<string>()
    data.rows.forEach(r => {
      const v = r[periodKey] ?? ''
      if (v !== '') set.add(v)
    })
    return Array.from(set)
  }, [data, periodKey])
  // Default period to "Sep 25" when available
  useEffect(() => {
    if (!selectedPeriod && periodOptions.includes('Sep 25')) {
      setSelectedPeriod('Sep 25')
    }
  }, [periodOptions, selectedPeriod])
  const companyOptions = useMemo(() => {
    if (!data || !clientIdKey) return [] as string[]
    const set = new Set<string>()
    data.rows.forEach(r => {
      const v = r[clientIdKey] ?? ''
      if (v !== '') set.add(v)
    })
    return Array.from(set)
  }, [data, clientIdKey])
  // Default company to "The Night Ventures" when available
  useEffect(() => {
    if (!selectedCompany && companyOptions.includes('The Night Ventures')) {
      setSelectedCompany('The Night Ventures')
    }
  }, [companyOptions, selectedCompany])

  const visibleRows = useMemo(() => {
    if (!data) return [] as Row[]
    return data.rows.filter(r => (
      (!selectedPeriod || !periodKey || (r[periodKey] ?? '') === selectedPeriod) &&
      (!selectedCompany || !clientIdKey || (r[clientIdKey] ?? '') === selectedCompany)
    ))
  }, [data, selectedPeriod, periodKey, selectedCompany, clientIdKey])

  const metricKeyKey = useMemo(() => data?.headers.find(h => h.toLowerCase() === 'metric_key') ?? null, [data])
  const metricValueKey = useMemo(() => data?.headers.find(h => h.toLowerCase() === 'metric_value') ?? null, [data])

  function parseNumberLike(raw: string | undefined): number | null {
    if (!raw) return null
    const cleaned = raw.toString().trim().replace(/[$,%\s]/g, '').replace(/,/g, '')
    if (cleaned === '') return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }

  const incomeValue = useMemo(() => {
    if (!data || !metricKeyKey || !metricValueKey) return null
    const inScope = data.rows.filter(r => (
      (!selectedPeriod || !periodKey || (r[periodKey] ?? '') === selectedPeriod) &&
      (!selectedCompany || !clientIdKey || (r[clientIdKey] ?? '') === selectedCompany)
    ))
    const match = inScope.find(r => (r[metricKeyKey] ?? '').toLowerCase() === 'income')
    if (!match) return null
    const n = parseNumberLike(match[metricValueKey])
    return n
  }, [data, selectedPeriod, periodKey, selectedCompany, clientIdKey, metricKeyKey, metricValueKey])

  const grossProfitValue = useMemo(() => {
    if (!data || !metricKeyKey || !metricValueKey) return null
    const inScope = data.rows.filter(r => (
      (!selectedPeriod || !periodKey || (r[periodKey] ?? '') === selectedPeriod) &&
      (!selectedCompany || !clientIdKey || (r[clientIdKey] ?? '') === selectedCompany)
    ))
    const match = inScope.find(r => (r[metricKeyKey] ?? '').toLowerCase() === 'gross profit')
    if (!match) return null
    return parseNumberLike(match[metricValueKey])
  }, [data, selectedPeriod, periodKey, selectedCompany, clientIdKey, metricKeyKey, metricValueKey])

  const ebitdaValue = useMemo(() => {
    if (!data || !metricKeyKey || !metricValueKey) return null
    const inScope = data.rows.filter(r => (
      (!selectedPeriod || !periodKey || (r[periodKey] ?? '') === selectedPeriod) &&
      (!selectedCompany || !clientIdKey || (r[clientIdKey] ?? '') === selectedCompany)
    ))
    const match = inScope.find(r => (r[metricKeyKey] ?? '').toLowerCase() === 'ebitda')
    if (!match) return null
    return parseNumberLike(match[metricValueKey])
  }, [data, selectedPeriod, periodKey, selectedCompany, clientIdKey, metricKeyKey, metricValueKey])

  const changeInCashValue = useMemo(() => {
    if (!data || !metricKeyKey || !metricValueKey) return null
    const inScope = data.rows.filter(r => (
      (!selectedPeriod || !periodKey || (r[periodKey] ?? '') === selectedPeriod) &&
      (!selectedCompany || !clientIdKey || (r[clientIdKey] ?? '') === selectedCompany)
    ))
    const match = inScope.find(r => (r[metricKeyKey] ?? '').toLowerCase() === 'change in cash')
    if (!match) return null
    return parseNumberLike(match[metricValueKey])
  }, [data, selectedPeriod, periodKey, selectedCompany, clientIdKey, metricKeyKey, metricValueKey])

  // Planned Income (Budget) for first chart comparison
  const plannedIncomeValue = useMemo(() => {
    if (!data || !metricKeyKey || !metricValueKey) return null
    const inScope = data.rows.filter(r => (
      (!selectedPeriod || !periodKey || (r[periodKey] ?? '') === selectedPeriod) &&
      (!selectedCompany || !clientIdKey || (r[clientIdKey] ?? '') === selectedCompany)
    ))
    const key = (s: string) => s.toLowerCase()
    const candidates = new Set([
      'planned income',
      'budget income',
      'income budget',
      'income (budget)',
      'income_plan',
      'income budget vs actual - budget'
    ])
    const match = inScope.find(r => candidates.has(key(r[metricKeyKey] ?? '')))
    if (!match) return null
    return parseNumberLike(match[metricValueKey])
  }, [data, selectedPeriod, periodKey, selectedCompany, clientIdKey, metricKeyKey, metricValueKey])

  const bvaIncomeValue = useMemo(() => {
    if (incomeValue == null || plannedIncomeValue == null) return null
    return incomeValue - plannedIncomeValue
  }, [incomeValue, plannedIncomeValue])

  function formatCurrency(n: number | null): string {
    if (n === null || n === undefined) return '—'
    const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    const sign = n < 0 ? '-' : ''
    return `${sign}$${formatter.format(Math.abs(n))}`
  }

  return (
    <>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0', flexWrap: 'wrap' }}>
              <div><strong>Rows:</strong> {visibleRows.length}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="label" htmlFor="periodSelect">Period</label>
                <select
                  id="periodSelect"
                  className="input"
                  style={{ width: 220 }}
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value)}
                >
                  <option value="">All periods</option>
                  {periodOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="label" htmlFor="companySelect">Company</label>
                <select
                  id="companySelect"
                  className="input"
                  style={{ width: 260 }}
                  value={selectedCompany}
                  onChange={e => setSelectedCompany(e.target.value)}
                >
                  <option value="">All companies</option>
                  {companyOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <section style={{ marginTop: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>Income</div>
                  <div style={{ fontSize: 22 }}>{formatCurrency(incomeValue)}</div>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>Gross Profit</div>
                  <div style={{ fontSize: 22 }}>{formatCurrency(grossProfitValue)}</div>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>EBITDA</div>
                  <div style={{ fontSize: 22 }}>{formatCurrency(ebitdaValue)}</div>
                </div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>Change in Cash</div>
                  <div style={{ fontSize: 22 }}>{formatCurrency(changeInCashValue)}</div>
                </div>
              </div>
            </section>
            <section style={{ marginTop: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>Income | Budget Vs Actual</div>
                  <div style={{ height: 220, background: '#fafafa', border: '1px dashed #e5e7eb', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                    {(() => {
                      const planned = plannedIncomeValue
                      const actual = incomeValue
                      const diff = bvaIncomeValue
                      const values = [planned ?? 0, actual ?? 0, diff ?? 0]
                      const tallest = Math.max(0, ...values.map(v => Math.abs(v)))
                      const scaleMax = Math.max(1, tallest * 1.2)
                      const maxBar = 160
                      function h(v: number | null) { if (v == null) return 0; return Math.round(Math.abs(v) / scaleMax * maxBar) }
                      const barBase = { width: 36, borderRadius: 0 }
                      return (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 12, color: '#374151' }}>{formatCurrency(planned ?? null)}</div>
                            <div style={{ ...barBase, height: h(planned), background: '#cbd5e1' }} />
                            <div style={{ fontSize: 11, color: '#525252', textAlign: 'center' }}>Planned</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 12, color: '#374151' }}>{formatCurrency(actual ?? null)}</div>
                            <div style={{ ...barBase, height: h(actual), background: '#60a5fa' }} />
                            <div style={{ fontSize: 11, color: '#525252', textAlign: 'center' }}>Income</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 12, color: '#374151' }}>{formatCurrency(diff ?? null)}</div>
                            <div style={{ ...barBase, height: h(diff), background: (diff ?? 0) >= 0 ? '#34d399' : '#f87171' }} />
                            <div style={{ fontSize: 11, color: '#525252', textAlign: 'center' }}>BvA</div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                {['Gross Profit %', 'EBITDA Trend'].map(title => (
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
            <div style={{ marginTop: 24, overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
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
                  {visibleRows.map((r, idx) => (
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
          </div>
        ) : null}
      </main>
    </>
  )
}

export default withPageAccess(BvaPage, 'bva');
