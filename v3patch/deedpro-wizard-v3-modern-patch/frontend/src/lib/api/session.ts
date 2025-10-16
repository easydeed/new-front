
'use client';
export function getAuthToken(): string | null {
  try {
    // Common patterns: localStorage 'token' or cookie 'access_token'
    const ls = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (ls) return ls;
  } catch {}
  return null;
}
