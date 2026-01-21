'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to new /admin route
export default function AdminHonestRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: '#f8fafc'
    }}>
      <p style={{ color: '#64748b' }}>Redirecting to admin...</p>
    </div>
  );
}
