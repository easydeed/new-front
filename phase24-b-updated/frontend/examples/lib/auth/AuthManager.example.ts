// SAMPLE ONLY – use your project's real AuthManager if present.
export type User = { id: string; email: string; role?: string; plan?: string };

export const AuthManager = {
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('access_token');
  },
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },
  setAuth(token: string, user?: User) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
    if (user) localStorage.setItem('user_data', JSON.stringify(user));
    // also set cookie if your app expects it
  },
  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
  },
};
