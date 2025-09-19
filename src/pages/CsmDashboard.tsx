import React, { useState, useEffect } from 'react'
import withPageAccess from '../lib/withPageAccess'

function CsmDashboardPage() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [clinicsData, setClinicsData] = useState([])
  const [filteredClinics, setFilteredClinics] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState('Jan-25')
  const [monthOptions, setMonthOptions] = useState([])

  // Check if user is logged in on component mount
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

  // Fetch clinics data from Google Sheet
  useEffect(() => {
    const fetchClinicsData = async () => {
      try {
        const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTw_wykcyZCFlLg5jg6lHvFcgjZfvjPuvH1rqXtwp2em3_YFEAaggVimR9NBylgYpI67BrNK4FR9gdW/pub?gid=0&single=true&output=csv';
        const noCacheUrl = `${sheetUrl}&_=${Date.now()}`;
        const response = await fetch(noCacheUrl, { headers: { 'Cache-Control': 'no-cache' } });
        
        if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);
        
        const csvText = await response.text();
        
        // Better CSV parsing function
        function parseCSVLine(line) {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        }
        
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) return; // Need at least header + 1 data row
        
        const headers = parseCSVLine(lines[0]);
        const clinicNameIndex = headers.indexOf('clinic_name');
        const csmIndex = headers.indexOf('CSM');
        
        if (clinicNameIndex === -1 || csmIndex === -1) return;
        
        const plansIndex = headers.indexOf('number_of_plans_sold');
        const averagePlansIndex = 3; // Column D (0-based index)
        const firstPlanDateIndex = 4; // Column E (0-based index)
        const snoutActIndex = 5; // Column F (0-based index)
        
        // Extract month options from L1:W1 (columns 11-22, 0-indexed)
        const months = headers.slice(11, 23).filter(month => month && month.trim());
        setMonthOptions(months);
        
        
        const clinics = [];
        for (let i = 1; i < lines.length; i++) {
          const row = parseCSVLine(lines[i]);
          if (row[clinicNameIndex] && row[csmIndex]) {
            // Create month data object
            const monthData = {};
            months.forEach((month, index) => {
              const monthColumnIndex = 11 + index; // L=11, M=12, etc.
              const rawValue = row[monthColumnIndex] || '';
              const parsedValue = parseInt(rawValue) || 0;
              monthData[month] = parsedValue;
            });
            
            
            const firstPlanDate = (row[firstPlanDateIndex] || '').trim();
            
            clinics.push({
              name: row[clinicNameIndex],
              csm: row[csmIndex],
              plansSold: plansIndex !== -1 ? parseInt(row[plansIndex]) || 0 : 0,
              averagePlansPerMonth: parseFloat(row[averagePlansIndex]) || 0,
              firstPlanSoldDate: firstPlanDate,
              snoutAct: parseFloat(row[snoutActIndex]) || 0,
              monthlyData: monthData
            });
            
          }
        }
        
        setClinicsData(clinics);
      } catch (error) {
        console.error('Error fetching clinics data:', error);
      }
    };
    
    fetchClinicsData();
  }, []);

  // Filter clinics based on search term and user's CSM assignment
  useEffect(() => {
    if (!user || !clinicsData.length || !searchTerm.trim()) {
      setFilteredClinics([]);
      setShowSuggestions(false);
      return;
    }

    const userFullName = `${user.firstName} ${user.lastName}`;
    const userClinics = clinicsData.filter(clinic => clinic.csm === userFullName);
    
    const filtered = userClinics.filter(clinic =>
      clinic.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredClinics(filtered);
    
    // Only show suggestions if no clinic is selected and there are matches
    const shouldShowSuggestions = filtered.length > 0 && 
                                  searchTerm.trim().length > 0 && 
                                  !selectedClinic;
    setShowSuggestions(shouldShowSuggestions);
  }, [searchTerm, user, clinicsData, selectedClinic]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // Clear selected clinic if user starts typing a new search
    if (selectedClinic && e.target.value !== selectedClinic.name) {
      setSelectedClinic(null);
    }
  };

  const handleSuggestionClick = (clinicName) => {
    setSearchTerm(clinicName);
    setShowSuggestions(false);
    
    // Find and set the selected clinic data
    const clinic = clinicsData.find(c => c.name === clinicName);
    setSelectedClinic(clinic);
  };

  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  // Get 6 months of data including and prior to selected month
  const getSixMonthsData = () => {
    if (!selectedClinic || !monthOptions.length) return [];
    
    const selectedIndex = monthOptions.indexOf(selectedMonth);
    if (selectedIndex === -1) return [];
    
    // Get 6 months including selected (5 prior + selected)
    const startIndex = Math.max(0, selectedIndex - 5);
    const monthsToShow = monthOptions.slice(startIndex, selectedIndex + 1);
    
    return monthsToShow.map(month => ({
      month,
      value: selectedClinic.monthlyData?.[month] || 0
    }));
  };

  // Mock data for demonstration
  const mockMetrics = {
    activeClients: 24,
    monthlyRecurringRevenue: 125000,
    churnRate: 2.5,
    customerSatisfaction: 4.8
  }

  function formatCurrency(n: number | null): string {
    if (n === null || n === undefined) return '—'
    const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    const sign = n < 0 ? '-' : ''
    return `${sign}$${formatter.format(Math.abs(n))}`
  }

  function formatPercentage(n: number | null): string {
    if (n === null || n === undefined) return '—'
    return `${n.toFixed(1)}%`
  }

  function formatRating(n: number | null): string {
    if (n === null || n === undefined) return '—'
    return `${n.toFixed(1)}/5.0`
  }

  function formatDate(dateString: string): string {
    if (!dateString || dateString.trim() === '') return '—'
    
    try {
      // Parse the date string (handles formats like "4/19/2023", "04/19/2023", etc.)
      const date = new Date(dateString)
      
      // Check if the date is valid
      if (isNaN(date.getTime())) return dateString // Return original if can't parse
      
      // Format as "Month Day, Year"
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      // If parsing fails, return the original string
      return dateString
    }
  }

  if (isLoading) {
    return (
      <main style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <>
      <header style={{ borderBottom: '1px solid #e5e5e5', background: '#ffffff' }}>
        <div className="layout" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <nav aria-label="Primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '24px' }}>
              <a href="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
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
              </a>
            </div>
          </nav>
        </div>
      </header>
      <main className="layout" style={{ paddingTop: 24, paddingBottom: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, lineHeight: '28px', margin: 0 }}>
            {user ? `Hello, ${user.firstName} ${user.lastName}` : 'CSM Dashboard'}
          </h2>
        </div>
        
        {/* Search Box and Month Selector */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search your assigned clinics..."
              className="input"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchTerm.trim() && filteredClinics.length > 0 && !selectedClinic) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={handleSearchBlur}
              style={{
                width: 300,
                fontSize: 14,
                padding: '8px 12px'
              }}
            />
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #e5e5e5',
                borderTop: 'none',
                borderRadius: '0 0 6px 6px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 1000,
                width: 300
              }}>
                {filteredClinics.map((clinic, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(clinic.name)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: index < filteredClinics.length - 1 ? '1px solid #f1f1f1' : 'none',
                      fontSize: 14,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    {clinic.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="label" htmlFor="monthSelect">Month:</label>
            <select
              id="monthSelect"
              className="input"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ width: 120 }}
            >
              {monthOptions.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          
          <section style={{ marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>Plans Sold - {selectedMonth}</div>
                <div style={{ fontSize: 22 }}>
                  {selectedClinic && selectedClinic.monthlyData ? 
                    selectedClinic.monthlyData[selectedMonth] || 0 : '—'}
                </div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>Average Plans Sold/Month</div>
                <div style={{ fontSize: 22 }}>
                  {selectedClinic ? selectedClinic.averagePlansPerMonth.toFixed(1) : '—'}
                </div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>Snout ACT</div>
                <div style={{ fontSize: 22 }}>
                  {selectedClinic ? Math.round(selectedClinic.snoutAct) : '—'}
                </div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                <div style={{ fontSize: 12, color: '#525252', marginBottom: 6 }}>First Plan Sold Date</div>
                <div style={{ fontSize: 22 }}>
                  {selectedClinic ? formatDate(selectedClinic.firstPlanSoldDate) : '—'}
                </div>
              </div>
            </div>
          </section>
          
          <section style={{ marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}># of Plans Sold Evolution</div>
                <div style={{ height: 220, background: '#fafafa', border: '1px dashed #e5e7eb', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                  {(() => {
                    const sixMonthsData = getSixMonthsData();
                    if (sixMonthsData.length === 0) {
                      return (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '100%', 
                          height: '100%',
                          color: '#9ca3af',
                          fontSize: 14
                        }}>
                          Select a clinic to view evolution
                        </div>
                      );
                    }
                    
                    const maxValue = Math.max(...sixMonthsData.map(d => d.value), 1);
                    const maxBarHeight = 160;
                    
                    return sixMonthsData.map((data, index) => {
                      const barHeight = (data.value / maxValue) * maxBarHeight;
                      const isSelected = data.month === selectedMonth;
                      
                      return (
                        <div key={data.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 12, color: '#374151', fontWeight: isSelected ? 600 : 400 }}>
                            {data.value}
                          </div>
                          <div style={{ 
                            width: 28, 
                            height: Math.max(barHeight, 4), 
                            background: isSelected ? '#3b82f6' : '#94a3b8',
                            borderRadius: 0,
                            transition: 'all 0.2s ease'
                          }} />
                          <div style={{ 
                            fontSize: 10, 
                            color: '#525252', 
                            textAlign: 'center',
                            fontWeight: isSelected ? 600 : 400
                          }}>
                            {data.month}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              {['Revenue Trend', 'Support Tickets'].map(title => (
                <div key={title} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>{title}</div>
                  <div style={{ height: 200, background: '#fafafa', border: '1px dashed #e5e7eb', borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </section>
          
          <section style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
              {['Onboarding Progress', 'Feature Adoption', 'Renewal Pipeline'].map(title => (
                <div key={title} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, background: '#ffffff' }}>
                  <div style={{ fontSize: 12, color: '#525252', marginBottom: 8 }}>{title}</div>
                  <div style={{ height: 200, background: '#fafafa', border: '1px dashed #e5e7eb', borderRadius: 6 }} />
                </div>
              ))}
            </div>
          </section>
          
        </div>
      </main>
    </>
  )
}

export default withPageAccess(CsmDashboardPage, 'csm');
