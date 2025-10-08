/** Minimal example wiring Past Deeds to /deeds */
import { useEffect, useState } from 'react';
export default function PastDeeds(){
  type Row = { id: string; property?: string; deed_type?: string; status?: string; created_at?: string; updated_at?: string; pdf_url?: string; };
  const [rows, setRows] = useState<Row[]>([]);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';
  useEffect(() => { (async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${api}/deeds`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    setRows(res.ok ? await res.json() : []);
  })(); }, []);
  return <table>{rows.map(r => <tr key={r.id}><td>{r.property}</td></tr>)}</table>
}
