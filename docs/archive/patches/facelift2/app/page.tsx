'use client'
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Check, Gauge, Shield, Workflow, ArrowRight, FileDigit, Wand2, Sparkles } from 'lucide-react'

const https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1887&auto=format&fit=crop_URL = 'https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1887&auto=format&fit=crop'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <Header />
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorksCreative />
      <VideoSection />
      <Pricing />
      <ApiSection />
      <CtaCapture />
      <Faq />
      <BigFooter />
    </div>
  )
}

// ... (rest of component same as prior attempt for brevity)

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/70 dark:bg-neutral-950/40 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative h-6 w-6 rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#2563EB] to-[#F26B2B]" />
            <div className="absolute inset-0 rounded-lg ring-1 ring-black/10" />
          </div>
          <span className="font-semibold tracking-tight">DeedPro</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#how" className="hover:opacity-80">How it Works</a>
          <a href="#features" className="hover:opacity-80">Features</a>
          <a href="#video" className="hover:opacity-80">Video</a>
          <a href="#pricing" className="hover:opacity-80">Pricing</a>
          <a href="#api" className="hover:opacity-80">API</a>
          <a href="#faq" className="hover:opacity-80">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="hidden sm:inline-flex">Sign in</Button>
          <Button className="group shadow-glow" asChild>
            <a href="/app/wizard" className="inline-flex items-center">
              Get Started <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"/>
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1887&auto=format&fit=crop_URL})`}}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/90 dark:from-neutral-950/70 dark:via-neutral-950/70 dark:to-neutral-950/80" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-30 bg-[#2563EB]" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-30 bg-[#F26B2B]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-32 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.25}}>
          <Badge variant="secondary" className="mb-4 bg-white text-neutral-700 ring-1 ring-black/5">
            AI‑assisted • Enterprise‑ready
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
            Create California deeds
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#F26B2B]">
              in minutes.
            </span>
          </h1>
          <p className="mt-5 text-lg text-neutral-700/90 dark:text-neutral-300 max-w-prose">
            DeedPro combines an AI‑assisted wizard, SmartReview, and integrations built for title workflows—so your team ships clean documents on the first pass.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild className="bg-[#2563EB] hover:brightness-95">
              <a href="/app/wizard">Start a Deed</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-neutral-300/80 hover:bg-white">
              <a href="#video">See 2‑min demo</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Omitted remaining sections in this snippet to keep the notebook concise.
