import { useState } from 'react';
import { MigrationBanner as MigrationBannerType } from '../lib/migrateLocalStorage';

interface Props {
  banner: MigrationBannerType;
  onComplete: () => void;
}

export function MigrationBanner({ banner, onComplete }: Props) {
  const [migrating, setMigrating] = useState(false);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await banner.onMigrate();
      onComplete();
    } catch (e) {
      console.error('Migration failed:', e);
      alert('Migration failed: ' + String(e.message || e));
    } finally {
      setMigrating(false);
    }
  };

  const handleDismiss = () => {
    banner.onDismiss();
    onComplete();
  };

  return (
    <div style={{ 
      padding: 12, 
      margin: '8px 0', 
      background: '#fff3cd', 
      border: '1px solid #ffeaa7', 
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div>
        <strong>Unsynced local data found for "{banner.collection}"</strong>
        <div style={{ fontSize: 12, color: '#666' }}>
          {banner.localCount} items in browser storage. Import to server?
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button 
          onClick={handleMigrate}
          disabled={migrating}
          style={{ 
            padding: '4px 12px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: 3,
            cursor: migrating ? 'not-allowed' : 'pointer'
          }}
        >
          {migrating ? 'Importing...' : 'Import'}
        </button>
        <button 
          onClick={handleDismiss}
          disabled={migrating}
          style={{ 
            padding: '4px 12px', 
            background: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: 3,
            cursor: migrating ? 'not-allowed' : 'pointer'
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
