'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function VerifyEmailContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const [msg, setMsg] = useState('Verifying…');
  const token = sp.get('token');

  useEffect(() => {
    (async () => {
      if (!token) { setMsg('Invalid verification link'); return; }
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/users/verify-email?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          const j = await res.json().catch(()=>({ detail:'Verification failed' }));
          throw new Error(j.detail || 'Verification failed');
        }
        setMsg('Email verified! Redirecting to login…');
        setTimeout(()=> router.push('/login'), 1200);
      } catch (e:any) {
        setMsg(e?.message || 'Verification failed');
      }
    })();
  }, [token, router]);

  return (
    <main style={{ maxWidth:480, margin:'48px auto', padding:'24px', border:'1px solid #eee', borderRadius:8 }}>
      <h1>Email Verification</h1>
      <p>{msg}</p>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth:480, margin:'48px auto', padding:'24px' }}>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
