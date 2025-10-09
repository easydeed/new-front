'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr("Passwords don't match"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password, confirm_password: confirm })
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({ detail:'Reset failed'}));
        throw new Error(j.detail || 'Reset failed');
      }
      setOk(true);
      setTimeout(()=> router.push('/login'), 1500);
    } catch (e:any) {
      setErr(e?.message || 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth:480, margin:'48px auto', padding:'24px', border:'1px solid #eee', borderRadius:8 }}>
      <h1>Reset Password</h1>
      {!token && <p style={{color:'crimson'}}>Invalid or missing token.</p>}
      {ok ? <p>Success! Redirecting to login…</p> : (
        <form onSubmit={onSubmit}>
          <div style={{ display:'grid', gap:12 }}>
            <label>
              New password
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} />
            </label>
            <label>
              Confirm password
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8} />
            </label>
            <button disabled={busy || !token} type="submit">{busy ? 'Updating…' : 'Update password'}</button>
            {err && <p style={{color:'crimson'}}>{err}</p>}
          </div>
        </form>
      )}
    </main>
  );
}
