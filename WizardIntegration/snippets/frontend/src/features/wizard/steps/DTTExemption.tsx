'use client';
// TODO: adjust import path to your actual store hook
import React from 'react';

export default function DTTExemption() {
  // Example: const { dtt, setDtt } = useWizardStore();
  const setVal = (v: string) => { /* setDtt({ ...dtt, exemptReason: v }) */ };
  return (
    <section>
      <h2>Documentary Transfer Tax — Exemption</h2>
      <p className="helper">If applicable (interspousal), add a short reason.</p>
      <label>Exemption reason</label>
      <input onChange={(e)=>setVal(e.target.value)} placeholder="Interspousal transfer (R&T §11927)" style={{width:'100%'}} />
    </section>
  );
}
