
'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function StickyCTA(){
  const [show, setShow] = useState(false);
  useEffect(()=>{
    const onScroll = () => {
      const scrolled = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      setShow(scrolled > 0.33);
    };
    onScroll();
    window.addEventListener('scroll', onScroll);
    return ()=> window.removeEventListener('scroll', onScroll);
  },[]);

  if(!show) return null;
  return (
    <div className="sticky-cta px-4">
      <div className="bar mx-auto flex max-w-xl items-center justify-between gap-3 rounded-full px-3 py-2">
        <span className="text-sm text-white/80">Ready to create your first deed?</span>
        <div className="flex gap-2">
          <Link href="#start" className="rounded-full bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-black shadow-glow">Start a Deed</Link>
          <Link href="#demo" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-white/20 text-white/90">See 2‑min demo</Link>
        </div>
      </div>
    </div>
  );
}
