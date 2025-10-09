'use client';
import React from 'react';
export default function Covenants() {
  const setVal = (v: string) => { /* setWarranty({ covenants: v }) */ };
  return (
    <section>
      <h2>Warranty Covenants (optional)</h2>
      <p className="helper">Add standard covenant language if required by your firm.</p>
      <textarea onChange={(e)=>setVal(e.target.value)} style={{width:'100%', height:140}} placeholder="Grantor covenants that..."/>
    </section>
  );
}
