export function withMode(url: string, mode?: 'modern' | 'classic' | null) {
  try {
    const u = new URL(url, 'http://localhost'); // base ignored for path-only urls
    if (mode && !u.searchParams.get('mode')) {
      u.searchParams.set('mode', mode);
    }
    // strip origin if provided base
    return u.pathname + (u.search ? u.search : '') + (u.hash || '');
  } catch {
    // Fallback for relative templates like `/deeds/${id}/preview`
    if (mode && !/\?mode=/.test(url)) {
      return url + (url.includes('?') ? '&' : '?') + `mode=${mode}`;
    }
    return url;
  }
}

