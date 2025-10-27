
'use client';
import React from 'react';
import Image from 'next/image';

export default function DeedCard(){
  return (
    <div className="tilt-wrap mx-auto max-w-3xl">
      <div className="tilt relative rounded-2xl border border-white/10 bg-white/5 p-3 shadow-card">
        {/* Faux tabs */}
        <div className="depth-1 pointer-events-none absolute left-4 top-3 z-10 flex gap-1">
          {['Edit','Confirm & Create','Preview'].map((t,i)=>(
            <div key={t}
              className={"rounded-full px-3 py-1 text-xs "+
                (i===2 ? "bg-white/90 text-black" : "bg-white/10 text-white/80")}>
              {t}
            </div>
          ))}
        </div>
        {/* Document */}
        <div className="relative overflow-hidden rounded-xl ring-1 ring-white/10">
          <Image src="/deed-mock.png" alt="Deed preview" width={1400} height={980} priority />
          {/* Stamp overlay */}
          <div className="pointer-events-none absolute right-6 top-10 rotate-[-8deg] rounded-full border-2 border-red-400/80 bg-red-400/20 px-4 py-1 text-sm font-semibold text-red-100/90 shadow-glow animate-pulse-stamp">
            Recorded
          </div>
          {/* gloss */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/10 mix-blend-overlay" />
        </div>
      </div>
    </div>
  );
}
