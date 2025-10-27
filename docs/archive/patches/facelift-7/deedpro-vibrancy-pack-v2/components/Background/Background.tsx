
'use client';
import React from 'react';

export default function Background(){
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-[-10%] animate-slow-pan"
        style={{
          backgroundImage:
           "radial-gradient(50% 50% at 50% 0%, rgba(56,189,248,0.14) 0%, transparent 60%),"+
           "radial-gradient(40% 30% at 85% 8%, rgba(168,85,247,0.10) 0%, transparent 60%),"+
           "radial-gradient(30% 40% at 15% 12%, rgba(16,185,129,0.12) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(65%_65%_at_50%_40%,#000_45%,transparent)]" />
      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay" />
    </div>
  )
}
