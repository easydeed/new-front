
'use client';
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import DeedCard from './DeedCard';

export default function DeedHero(){
  return (
    <section className="relative pt-28 md:pt-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.6}} className="text-sm tracking-wide text-muted">
            AI‑assisted • Enterprise‑ready
          </motion.div>
          <motion.h1 initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.6, delay:.05}}
            className="mx-auto mt-3 max-w-4xl text-balance text-4xl font-bold sm:text-6xl">
            Create <span className="text-gradient">California deeds</span> in minutes.
          </motion.h1>
          <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.6, delay:.1}}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted">
            DeedPro combines an AI‑assisted wizard, SmartReview, and integrations built for title workflows—so your team ships clean documents on the first pass.
          </motion.p>
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.6, delay:.15}}
            className="mt-8 flex items-center justify-center gap-4">
            <Link href="#start" className="shimmer rounded-full bg-[rgb(var(--accent))] px-6 py-3 text-sm font-semibold text-black shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Start a Deed
            </Link>
            <Link href="#demo" className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white/90 ring-1 ring-inset ring-white/15 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              See 2‑min demo
            </Link>
          </motion.div>
        </div>

        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:.6, delay:.2}} className="mt-12">
          <DeedCard />
        </motion.div>

        {/* Stats */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.35, duration:.6}}
          className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-4">
          {[
            ["1m 45s","Avg. time to preview"],
            ["99.9%","Uptime"],
            ["58","CA counties supported"],
            ["25k+","Docs generated"],
          ].map(([v,l])=>(
            <div key={l} className="text-center">
              <div className="text-lg font-semibold">{v}</div>
              <div className="mt-1 text-xs text-muted">{l}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
