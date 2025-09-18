import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function withPageAccess<T extends {}>(
  Wrapped: React.ComponentType<T>, 
  slug: string
) {
  return (props: T) => {
    const nav = useNavigate();
    const [ok, setOk] = useState<boolean | null>(null);
    
    useEffect(() => {
      (async () => {
        try {
          const r = await fetch('/api/auth/me', { credentials: 'include' });
          if (!r.ok) {
            // Not logged in → bounce to home
            nav('/');
            return;
          }
          
          const me = await r.json();
          if (me?.pageAccess?.[slug]) {
            setOk(true);
          } else {
            // No access → bounce to home
            nav('/');
          }
        } catch (error) {
          console.error('Page access check failed:', error);
          nav('/');
        }
      })();
    }, [nav]);
    
    // Show loading state while checking access
    if (ok === null) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: 16,
          color: '#666'
        }}>
          Checking access...
        </div>
      );
    }
    
    return <Wrapped {...props} />;
  };
}
