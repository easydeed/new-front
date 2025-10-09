// Centralized access token helpers (standardize on 'access_token')
const KEY = 'access_token';

export function getAccessToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function setAccessToken(token: string) {
  try { localStorage.setItem(KEY, token); } catch {}
}

export function clearAccessToken() {
  try { localStorage.removeItem(KEY); } catch {}
}
