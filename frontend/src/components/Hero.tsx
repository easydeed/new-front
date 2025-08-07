'use client';

import { useState, useEffect } from 'react';
import { RocketLaunchIcon, SparklesIcon, BuildingOfficeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { ArrowRight, Sparkles, Zap, Star } from './Icons';

export default function Hero() {

  return (
    <section className="py-16 bg-light-seafoam">

      <div className="w-full px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="text-center lg:text-left">
        
        {/* Enhanced badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 bg-surface text-dark-slate px-4 py-2 rounded-full text-xs font-medium border border-dark-slate/10">
            <RocketLaunchIcon className="h-4 w-4 text-gentle-indigo" />
            AI-Enhanced • Enterprise Ready
          </span>
        </div>
        
        {/* Enhanced main title */}
        <h1 className="text-4xl lg:text-6xl font-bold text-dark-slate leading-tight mb-4">
          <span className="relative">
            Deed
            
          </span>
          <span className="text-gentle-indigo">Pro</span>
        </h1>
        
        {/* Enhanced subtitle with dual-audience messaging */}
        <h2 className="text-xl lg:text-2xl font-medium text-dark-slate leading-tight mb-6">
          Streamline Deeds for Businesses and Independents
          <br />
          <span className="text-gentle-indigo">AI-Enhanced • Enterprise Ready</span>
        </h2>
        
        {/* Enhanced description for dual audiences */}
        <p className="text-dark-slate/80 text-base mb-6 leading-relaxed">
          Perfect for <span className="text-deep-teal dark:text-tropical-teal font-semibold">independent escrow officers</span> and 
          <span className="text-gentle-indigo font-semibold"> enterprise teams</span>. 
          Features <span className="text-dark-slate font-semibold">AI assistance</span>, 
          seamless integrations, and scalable API access.
        </p>
        
        {/* Enhanced feature badges */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center lg:justify-start">
          <span className="bg-surface text-dark-slate px-3 py-1.5 rounded-full text-xs font-medium border border-dark-slate/10 flex items-center gap-2">
            <SparklesIcon className="h-4 w-4 text-gentle-indigo" />
            AI Wizard
          </span>
          <span className="bg-surface text-dark-slate px-3 py-1.5 rounded-full text-xs font-medium border border-dark-slate/10 flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4 text-gentle-indigo" />
            API Integrations
          </span>
          <span className="bg-surface text-dark-slate px-3 py-1.5 rounded-full text-xs font-medium border border-dark-slate/10 flex items-center gap-2">
            <Zap className="h-4 w-4 text-gentle-indigo" />
            Enterprise Ready
          </span>
          <span className="bg-surface text-dark-slate px-3 py-1.5 rounded-full text-xs font-medium border border-dark-slate/10 flex items-center gap-2">
            <DevicePhoneMobileIcon className="h-4 w-4 text-gentle-indigo" />
            iPhone-Style UX
          </span>
        </div>
        
        {/* Enhanced CTA buttons */}
        <div className="flex gap-3 flex-wrap justify-center lg:justify-start mb-8">
          <a 
            href="/create-deed" 
            className="bg-gentle-indigo text-white px-6 py-3 rounded-xl shadow-elevated text-sm font-medium flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Try AI Wizard
            <ArrowRight className="h-4 w-4" />
          </a>
          <a 
            href="#api" 
            className="bg-surface text-dark-slate px-6 py-3 rounded-xl border border-dark-slate/10 text-sm font-medium flex items-center gap-2"
          >
            Explore API
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        
        {/* Enhanced stats */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center lg:justify-start text-xs text-dark-slate/70">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gentle-indigo rounded-full"></div>
            <span>Trusted by <span className="text-dark-slate font-semibold">1,200+</span> escrow officers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gentle-indigo rounded-full"></div>
            <span>Integrates with <span className="text-dark-slate font-semibold">SoftPro & Qualia</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gentle-indigo rounded-full"></div>
            <span><span className="text-dark-slate font-semibold">99.9%</span> API uptime</span>
          </div>
        </div>
      </div>
            <div className="hidden lg:block">
              <div className="bg-surface rounded-2xl shadow-elevated overflow-hidden border border-dark-slate/10">
                <div className="bg-surface h-12 flex items-center justify-start px-6 border-b border-dark-slate/10">
                  <div className="flex gap-3">
                    <div className="w-3 h-3 bg-accent rounded-full"></div>
                    <div className="w-3 h-3 bg-accent/70 rounded-full"></div>
                    <div className="w-3 h-3 bg-gentle-indigo rounded-full"></div>
                  </div>
                  <div className="flex-1 text-center text-dark-slate text-sm font-medium">DeedPro AI Wizard</div>
                </div>
                <div className="p-8 h-72 flex flex-col items-center justify-center text-dark-slate">
                  <div className="text-5xl mb-4">🏠</div>
                  <div className="text-center">
                    <div className="text-xl font-semibold mb-2 text-gentle-indigo">AI-Enhanced Deed Wizard</div>
                    <div className="text-dark-slate/70">Interactive cards • Smart tooltips • Real-time assistance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 