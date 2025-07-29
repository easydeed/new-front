'use client';

import { RocketLaunchIcon, SparklesIcon, BuildingOfficeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 bg-charcoal-blue">
      <div className="flex-1 text-center lg:text-left max-w-3xl lg:pr-12">
        <div className="mb-6">
          <span className="inline-block bg-slate-navy text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center justify-center lg:justify-start gap-2 w-fit mx-auto lg:mx-0">
            <RocketLaunchIcon className="h-4 w-4" />
            AI-Powered • Enterprise Ready
          </span>
        </div>
        
        <h1 className="text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
          DeedPro
        </h1>
        
        <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-6">
          AI-Enhanced Real Estate Document Platform with Enterprise API
        </h2>
        
        <p className="text-aqua-mint text-xl mb-4 leading-relaxed">
          Transform deed creation with AI assistance, seamless SoftPro & Qualia integrations, 
          and an enterprise API that connects your entire workflow.
        </p>
        
        <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
          <span className="bg-slate-navy text-white px-3 py-1 rounded-full text-sm font-medium border border-tropical-teal flex items-center gap-1">
            <SparklesIcon className="h-4 w-4 text-tropical-teal" /> AI Wizard
          </span>
          <span className="bg-slate-navy text-white px-3 py-1 rounded-full text-sm font-medium border border-tropical-teal flex items-center gap-1">
            <BuildingOfficeIcon className="h-4 w-4 text-tropical-teal" /> API Integrations
          </span>
          <span className="bg-electric-indigo text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 shadow-lg">
            <BuildingOfficeIcon className="h-4 w-4" /> Enterprise Ready
          </span>
          <span className="bg-slate-navy text-white px-3 py-1 rounded-full text-sm font-medium border border-tropical-teal flex items-center gap-1">
            <DevicePhoneMobileIcon className="h-4 w-4 text-tropical-teal" /> iPhone-Style UX
          </span>
        </div>
        
        <div className="flex gap-4 flex-wrap justify-center lg:justify-start mb-8">
          <a 
            href="/create-deed" 
            className="bg-tropical-teal text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-aqua-mint transition-all transform hover:scale-105 font-semibold text-lg"
          >
            Try AI Wizard →
          </a>
          <a 
            href="#api" 
            className="bg-slate-navy text-white px-8 py-4 rounded-xl hover:bg-electric-indigo hover:text-white transition-all font-semibold text-lg border border-tropical-teal"
          >
            Explore API
          </a>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center lg:justify-start text-sm text-aqua-mint">
          <div className="flex items-center gap-2">
            <span className="text-tropical-teal">✅</span>
            <span>Trusted by 1,200+ escrow officers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-electric-indigo">🔗</span>
            <span>Integrates with SoftPro & Qualia</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-tropical-teal">⚡</span>
            <span>99.9% API uptime</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 mt-12 lg:mt-0 max-w-2xl">
        <div className="relative">
          {/* Main Dashboard Screenshot Placeholder */}
          <div className="bg-slate-navy rounded-2xl shadow-2xl overflow-hidden border border-tropical-teal">
            <div className="bg-charcoal-blue h-8 flex items-center justify-start px-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-tropical-teal rounded-full"></div>
              </div>
              <div className="flex-1 text-center text-aqua-mint text-xs">DeedPro AI Wizard</div>
            </div>
            <div className="p-8 h-96 flex flex-col items-center justify-center text-white">
              <div className="text-6xl mb-4">🏠</div>
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">AI-Enhanced Deed Wizard</div>
                <div className="text-sm text-aqua-mint">Interactive cards • Smart tooltips • Real-time assistance</div>
              </div>
              <div className="mt-6 flex gap-2">
                <div className="w-3 h-3 bg-tropical-teal rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-aqua-mint rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-3 h-3 bg-electric-indigo rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
          
          {/* Floating API badge */}
          <div className="absolute -top-4 -right-4 bg-electric-indigo text-white px-4 py-2 rounded-lg shadow-lg transform rotate-12 hover:rotate-0 transition-transform">
            <div className="text-xs font-bold">API READY</div>
            <div className="text-xs">RESTful + GraphQL</div>
          </div>
          
          {/* Integration badges */}
          <div className="absolute -bottom-6 -left-4 bg-slate-navy rounded-lg shadow-lg p-3 border border-tropical-teal">
            <div className="text-xs text-aqua-mint mb-1">Integrates with:</div>
            <div className="flex gap-2">
              <span className="bg-charcoal-blue text-tropical-teal px-2 py-1 rounded text-xs font-medium">SoftPro 360</span>
              <span className="bg-charcoal-blue text-tropical-teal px-2 py-1 rounded text-xs font-medium">Qualia</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 