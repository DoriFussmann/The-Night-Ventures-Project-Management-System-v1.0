import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { handleLogout } from '../utils/auth'

type Row = Record<string, string | number>

interface BvaApiResponse {
  data: Row[];
  source: 'database' | 'csv';
  project: {
    id: string;
    name: string;
    slug: string;
  };
  period: string;
}

export default function BvaPage() {
  const { projectSlug } = useParams<{ projectSlug: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiData, setApiData] = useState<BvaApiResponse | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')

  // API helper
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Slug': projectSlug || '',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }
    
    return response.json();
  };

  // Fetch data from API
  useEffect(() => {
    async function fetchData() {
      if (!projectSlug) {
        setError('Project slug is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (selectedPeriod) {
          params.append('period', selectedPeriod);
        }
        params.append('projectSlug', projectSlug);
        
        const url = `/api/bva?${params.toString()}`;
        const response = await apiCall(url);
        setApiData(response);
      } catch (e: any) {
        setError(e?.message || 'Failed to load BvA data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [projectSlug, selectedPeriod]);

  // Extract data for processing
  const data = useMemo(() => {
    if (!apiData) return null;
    
    // Convert API data to the format expected by the existing logic
    const rows = apiData.data.map(item => {
      const row: Record<string, string> = {};
      Object.entries(item).forEach(([key, value]) => {
        row[key] = String(value);
      });
      return row;
    });
    
    // Determine headers from the data
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    
    return { headers, rows };
  }, [apiData]);

  // Get available periods and companies
  const periodOptions = useMemo(() => {
    if (!data) return [] as string[]
    const set = new Set<string>()
    data.rows.forEach(r => {
      const v = r['period'] ?? ''
      if (v !== '') set.add(v)
    })
    return Array.from(set).sort()
  }, [data])

  const companyOptions = useMemo(() => {
    if (!data) return [] as string[]
    const set = new Set<string>()
    data.rows.forEach(r => {
      const v = r['company'] ?? ''
      if (v !== '') set.add(v)
    })
    return Array.from(set).sort()
  }, [data])

  // Set default selections
  useEffect(() => {
    if (!selectedPeriod && periodOptions.length > 0) {
      setSelectedPeriod(periodOptions[0])
    }
  }, [periodOptions, selectedPeriod])

  useEffect(() => {
    if (!selectedCompany && companyOptions.includes('The Night Ventures')) {
      setSelectedCompany('The Night Ventures')
    } else if (!selectedCompany && companyOptions.length > 0) {
      setSelectedCompany(companyOptions[0])
    }
  }, [companyOptions, selectedCompany])

  // Filter visible rows
  const visibleRows = useMemo(() => {
    if (!data) return [] as Row[]
    return data.rows.filter(r => (
      (!selectedPeriod || (r['period'] ?? '') === selectedPeriod) &&
      (!selectedCompany || (r['company'] ?? '') === selectedCompany)
    ))
  }, [data, selectedPeriod, selectedCompany])

  function parseNumberLike(raw: string | undefined): number | null {
    if (!raw) return null
    const cleaned = raw.toString().trim().replace(/[$,%\s]/g, '').replace(/,/g, '')
    if (cleaned === '') return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }

  function formatCurrency(value: number | null): string {
    if (value === null) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Calculate metrics
  const plannedIncomeValue = useMemo(() => {
    const match = visibleRows.find(r => r.category === 'Revenue')
    return parseNumberLike(String(match?.planned || '0'))
  }, [visibleRows])

  const actualIncomeValue = useMemo(() => {
    const match = visibleRows.find(r => r.category === 'Revenue')
    return parseNumberLike(String(match?.actual || '0'))
  }, [visibleRows])

  const bvaIncomeValue = useMemo(() => {
    if (plannedIncomeValue === null || actualIncomeValue === null) return null
    return actualIncomeValue - plannedIncomeValue
  }, [plannedIncomeValue, actualIncomeValue])

  // Chart data
  const chartData = useMemo(() => {
    const data = [
      { label: 'Planned Income', value: plannedIncomeValue || 0, color: '#3b82f6' },
      { label: 'Income', value: actualIncomeValue || 0, color: '#10b981' },
      { label: 'BvA Income', value: bvaIncomeValue || 0, color: bvaIncomeValue && bvaIncomeValue >= 0 ? '#10b981' : '#ef4444' }
    ]
    return data
  }, [plannedIncomeValue, actualIncomeValue, bvaIncomeValue])

  const yAxisMax = useMemo(() => {
    const maxValue = Math.max(...chartData.map(d => Math.abs(d.value)))
    return maxValue * 1.2
  }, [chartData])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
          <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h1 style={{ margin: 0 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  The Night Ventures
                </Link>
              </h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-sm" to="/bva">BvA Test</Link>
                <Link className="btn btn-sm" to="/admin">Admin</Link>
                <Link className="btn btn-sm" to={`/app/${projectSlug}`}>Workspace</Link>
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
        
        <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <div style={{ textAlign: 'center', padding: 48 }}>
            Loading BvA data...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa' }}>
        <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
          <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
            <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <h1 style={{ margin: 0 }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  The Night Ventures
                </Link>
              </h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn btn-sm" to="/bva">BvA Test</Link>
                <Link className="btn btn-sm" to="/admin">Admin</Link>
                <Link className="btn btn-sm" to={`/app/${projectSlug}`}>Workspace</Link>
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
        
        <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <div style={{ textAlign: 'center', padding: 48, color: 'red' }}>
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <h1 style={{ margin: 0 }}>
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                The Night Ventures
              </Link>
            </h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="btn btn-sm" to="/bva">BvA Test</Link>
              <Link className="btn btn-sm" to="/admin">Admin</Link>
              <Link className="btn btn-sm" to={`/app/${projectSlug}`}>Workspace</Link>
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

      <main className="layout" style={{ paddingTop: 24, paddingBottom: 32 }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 24, fontSize: 14, color: '#666' }}>
          <Link to={`/app/${projectSlug}`} style={{ color: '#007bff', textDecoration: 'none' }}>
            {apiData?.project.name || projectSlug}
          </Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span>BvA Dashboard</span>
        </div>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Budget vs Actual Dashboard</h2>
          {apiData && (
            <div style={{ fontSize: 12, color: '#666' }}>
              Data source: {apiData.source === 'database' ? 'Database' : 'CSV Fallback'}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>
              Period:
            </label>
            <select 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="">All Periods</option>
              {periodOptions.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 'bold' }}>
              Company:
            </label>
            <select 
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="">All Companies</option>
              {companyOptions.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Income Chart */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>Income | Budget Vs Actual</div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-around', 
            alignItems: 'flex-end', 
            height: 200, 
            background: '#fafafa', 
            border: '1px dashed #e5e7eb', 
            borderRadius: 6, 
            padding: 16 
          }}>
            {chartData.map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>{formatCurrency(value)}</div>
                <div
                  style={{
                    width: '60%',
                    height: `${yAxisMax > 0 ? (Math.abs(value) / yAxisMax) * 100 : 0}%`,
                    background: color,
                    transition: 'height 0.3s ease-in-out',
                    minHeight: 4
                  }}
                />
                <div style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Table */}
        <section>
          <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>
            Detailed Data ({visibleRows.length} records)
          </div>
          <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 4, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5e5', background: '#f8f9fa' }}>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 12, fontWeight: 'bold' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 12, fontWeight: 'bold' }}>Company</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 12, fontWeight: 'bold' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: 12, fontSize: 12, fontWeight: 'bold' }}>Subcategory</th>
                  <th style={{ textAlign: 'right', padding: 12, fontSize: 12, fontWeight: 'bold' }}>Planned</th>
                  <th style={{ textAlign: 'right', padding: 12, fontSize: 12, fontWeight: 'bold' }}>Actual</th>
                  <th style={{ textAlign: 'right', padding: 12, fontSize: 12, fontWeight: 'bold' }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      No data available for the selected filters
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: 12, fontSize: 12 }}>{row.date}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>{row.company}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>{row.category}</td>
                      <td style={{ padding: 12, fontSize: 12 }}>{row.subcategory}</td>
                      <td style={{ padding: 12, fontSize: 12, textAlign: 'right' }}>
                        {formatCurrency(parseNumberLike(String(row.planned)))}
                      </td>
                      <td style={{ padding: 12, fontSize: 12, textAlign: 'right' }}>
                        {formatCurrency(parseNumberLike(String(row.actual)))}
                      </td>
                      <td style={{ 
                        padding: 12, 
                        fontSize: 12, 
                        textAlign: 'right',
                        color: parseNumberLike(String(row.variance)) && parseNumberLike(String(row.variance))! >= 0 ? '#10b981' : '#ef4444'
                      }}>
                        {formatCurrency(parseNumberLike(String(row.variance)))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
