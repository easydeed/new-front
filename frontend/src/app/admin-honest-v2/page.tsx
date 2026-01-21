'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Redirect to new /admin route
export default function AdminHonestV2Redirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    const newUrl = tab ? `/admin?tab=${tab}` : '/admin';
    router.replace(newUrl);
  }, [router, searchParams]);
  
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
