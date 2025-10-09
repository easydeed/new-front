export async function downloadFromResponse(res: Response, filenameBase: string) {
  if (!res.ok) {
    try {
      const err = await res.json();
      throw new Error(err.detail || 'Failed');
    } catch {
      throw new Error('Failed to generate PDF');
    }
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}_${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
