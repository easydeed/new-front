// Minimal test wizard for Interspousal Transfer Grant Deed (CA) (safe canary route)
'use client';
import { useState } from 'react';

export default function Page() {
  const [data, setData] = useState<any>({ 
    requested_by: '',
    title_company: '',
    escrow_no: '',
    return_to: { name:'', company:'', address1:'', city:'', state:'CA', zip:'' },
    apn: '',
    county: 'Los Angeles',
    legal_description: '',
    property_address: '',
    grantors_text: '',
    grantees_text: '',
    execution_date: new Date().toISOString().slice(0,10), dtt_exempt_reason:''
  });
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState<string|null>(null);
  const setField=(k:string,v:any)=>setData((s:any)=>({...s,[k]:v}));

  async function generate(){
    try {
      setBusy(true); setErr(null);
      const token = localStorage.getItem('token');
      const headers: any = {'Content-Type':'application/json'};
      if(token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/generate/interspousal-transfer-ca', { method:'POST', headers, body: JSON.stringify(data) });
      if(!res.ok) throw new Error((await res.json()).detail || 'Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='Interspousal_Transfer_CA_'+Date.now()+'.pdf'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch(e:any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (<main style={{maxWidth:800, margin:'0 auto', padding:'1rem'}}>
    <h1>Interspousal Transfer Grant Deed (CA)</h1>
    <p>Use this page to validate the backend and template before wiring to the main wizard.</p>

    <label>Grantor(s)</label>
    <input value={data.grantors_text} onChange={e=>setField('grantors_text', e.target.value)} placeholder="JOHN DOE; JANE DOE" style={{width:'100%',marginBottom:8}}/>

    <label>Grantee(s)</label>
    <input value={data.grantees_text} onChange={e=>setField('grantees_text', e.target.value)} placeholder="THE SMITH FAMILY TRUST" style={{width:'100%',marginBottom:8}}/>

    <label>County</label>
    <input value={data.county} onChange={e=>setField('county', e.target.value)} style={{width:'100%',marginBottom:8}}/>

    <label>Legal Description</label>
    <textarea value={data.legal_description} onChange={e=>setField('legal_description', e.target.value)} style={{width:'100%',height:120,marginBottom:8}}/>

    <label>Property Address</label>
    <input value={data.property_address} onChange={e=>setField('property_address', e.target.value)} style={{width:'100%',marginBottom:8}}/>

    <label>APN</label>
    <input value={data.apn} onChange={e=>setField('apn', e.target.value)} style={{width:'100%',marginBottom:8}}/>

    <label>Transfer Tax Exemption Reason</label>
    <input value={data.dtt_exempt_reason} onChange={e=>setField('dtt_exempt_reason', e.target.value)} style={{width:'100%',marginBottom:8}}/>


    <div style={{marginTop:12}}>
      <button onClick={generate} disabled={busy} style={{padding:'8px 12px'}}>{busy?'Generating...':'Generate PDF'}</button>
      {err && <span style={{color:'red', marginLeft:12}}>Error: {err}</span>}
    </div>
  </main>);
}

