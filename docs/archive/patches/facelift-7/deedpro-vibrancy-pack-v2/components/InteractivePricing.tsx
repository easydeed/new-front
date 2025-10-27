
'use client';
import React, { useState, useMemo } from 'react';

export default function InteractivePricing(){
  const [volume, setVolume] = useState(120); // deeds / month
  const unit = 1.25; // hypothetical marginal cost after included amount

  const plan = useMemo(()=>{
    if(volume <= 50) return { name: 'Starter', base: 0, included: 50, price: 0 };
    if(volume <= 350) return { name: 'Team', base: 149, included: 350, price: 149 + Math.max(0, volume-350)*unit };
    return { name: 'Enterprise', base: 399, included: 1000, price: 399 + Math.max(0, volume-1000)*unit };
  },[volume]);

  return (
    <section className="relative">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted">Select deeds per month</div>
            <div className="mt-1 text-2xl font-semibold">{volume}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">We recommend</div>
            <div className="mt-1 text-xl font-semibold">{plan.name}</div>
          </div>
        </div>
        <input type="range" min="10" max="2000" step="10" value={volume}
          onChange={e=>setVolume(parseInt(e.target.value))}
          className="mt-6 w-full accent-[rgb(var(--ring))]"/>
        <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
          <div className="card p-4">
            <div className="text-muted">Estimated monthly</div>
            <div className="mt-1 text-2xl font-semibold">${(plan.price).toFixed(0)}</div>
          </div>
          <div className="card p-4">
            <div className="text-muted">Included</div>
            <div className="mt-1 text-2xl font-semibold">{plan.included}</div>
          </div>
          <div className="card p-4">
            <div className="text-muted">Marginal after</div>
            <div className="mt-1 text-2xl font-semibold">${unit.toFixed(2)}/deed</div>
          </div>
        </div>
        <div className="mt-6 text-xs text-muted">Numbers here are illustrative; wire to your real billing when ready.</div>
      </div>
    </section>
  )
}
