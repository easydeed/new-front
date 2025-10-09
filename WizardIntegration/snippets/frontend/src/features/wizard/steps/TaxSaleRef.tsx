'use client';
import React from 'react';
export default function TaxSaleRef() {
  const setVal = (v: string) => { /* setTax({ saleRef: v }) */ };
  return (
    <section>
      <h2>Tax Sale Reference</h2>
      <p className="helper">Enter the tax sale reference (e.g., sale ID or notice).</p>
      <input onChange={(e)=>setVal(e.target.value)} style={{width:'100%'}} placeholder="Sale ID 2024-ABC-12345" />
    </section>
  );
}
