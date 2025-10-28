'use client'
import React from 'react'
import Image from 'next/image'
import '../styles/globals.css'

export default function LandingPage() {
  return (
    <div className="min-h-screen text-neutral-900">
      <Header />
      <Hero />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-30 section-white/80 backdrop-blur border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md" style={{background: 'linear-gradient(45deg,#2563EB, #F26B2B)'}} />
          <span className="font-semibold tracking-tight">DeedPro</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#how" className="hover:opacity-80">How it Works</a>
          <a href="#features" className="hover:opacity-80">Features</a>
          <a href="#pricing" className="hover:opacity-80">Pricing</a>
          <a href="#faq" className="hover:opacity-80">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <a href="/login" className="btn btn-outline--dark">Sign in</a>
          <a href="/app/wizard" className="btn btn-primary">Get Started</a>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="section-blue text-on-blue">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-36 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block mb-4 px-3 py-1 rounded-lg bg-white/10 border border-white/25 text-sm">AI‑assisted • Enterprise‑ready</span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">Create California deeds <span className="block">in minutes.</span></h1>
          <p className="mt-5 text-lg subtle-on-blue max-w-prose">DeedPro combines an AI‑assisted wizard, SmartReview, and integrations built for title workflows—so your team ships clean documents on the first pass.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a href="/app/wizard" className="btn btn-primary">Start a Deed</a>
            <a href="/demo" className="btn btn-outline">See 2‑min demo</a>
          </div>
        </div>
        <div className="glass card">
          <div className="p-6 pb-0 flex items-center justify-between">
            <div className="font-medium">SmartReview — Grant Deed</div>
            <span className="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/25">Preview</span>
          </div>
          <div className="mt-4 relative">
            <img src="/images/deed-hero.png" width="1200" height="675" alt="Deed preview" className="w-full h-auto" />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-white/20" />
          </div>
          <div className="p-6 flex gap-3">
            <button className="btn btn-outline">Edit</button>
            <button className="btn btn-accent">Confirm & Create</button>
          </div>
        </div>
      </div>
    </section>
  )
}
