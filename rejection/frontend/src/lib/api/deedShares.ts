export async function getShareFeedback(shareId: number, token?: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const res = await fetch(`${apiBase}/deed-shares/${shareId}/feedback`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    },
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}
