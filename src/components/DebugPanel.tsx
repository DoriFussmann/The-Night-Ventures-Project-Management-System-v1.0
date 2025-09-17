import { useState, useEffect } from 'react';
import { getHealth } from '../lib/dataClient';

interface HealthData {
  contentDir: string;
  collections: Array<{
    name: string;
    path: string;
    size: number;
    mtime: string | null;
    exists: boolean;
  }>;
}

export function DebugPanel() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadHealth = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  if (loading) return <div>Loading health data...</div>;
  if (error) return <div style={{ color: 'red' }}>Health check failed: {error}</div>;
  if (!health) return null;

  return (
    <details style={{ marginTop: 16, padding: 12, border: '1px solid #e5e5e5', borderRadius: 4 }}>
      <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Panel</summary>
      <div style={{ marginTop: 8, fontSize: 12, fontFamily: 'monospace' }}>
        <div><strong>Content Directory:</strong> {health.contentDir}</div>
        <div style={{ marginTop: 8 }}>
          <strong>Collections:</strong>
          {health.collections.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No collections found</div>
          ) : (
            <table style={{ marginTop: 4, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>Name</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Size</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Modified</th>
                  <th style={{ textAlign: 'left', padding: 4 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {health.collections.map(c => (
                  <tr key={c.name} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 4 }}>{c.name}</td>
                    <td style={{ padding: 4 }}>{c.size.toLocaleString()} bytes</td>
                    <td style={{ padding: 4 }}>
                      {c.mtime ? new Date(c.mtime).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: 4 }}>
                      <span style={{ 
                        color: c.exists ? 'green' : 'red',
                        fontWeight: 'bold'
                      }}>
                        {c.exists ? '✓' : '✗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <button 
          onClick={loadHealth}
          style={{ 
            marginTop: 8, 
            padding: '4px 8px', 
            fontSize: 11, 
            border: '1px solid #ccc',
            borderRadius: 3,
            background: '#f9f9f9',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>
    </details>
  );
}
