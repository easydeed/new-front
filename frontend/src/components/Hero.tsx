'use client';

import { RocketLaunchIcon, SparklesIcon, BuildingOfficeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

export default function Hero() {
  return (
    <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 bg-background">
      <div className="flex-1 text-center lg:text-left max-w-3xl lg:pr-12">
        <div className="mb-6">
          <span className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center justify-center lg:justify-start gap-2 w-fit mx-auto lg:mx-0">
            <RocketLaunchIcon className="h-4 w-4" />
            AI-Powered • Enterprise Ready
          </span>
        </div>
        
        <h1 className="text-6xl lg:text-7xl font-bold text-primary leading-tight mb-6">
          DeedPro
        </h1>
        
        <h2 className="text-3xl lg:text-4xl font-bold text-text-primary leading-tight mb-6">
          AI-Enhanced Real Estate Document Platform with Enterprise API
        </h2>
        
        <p className="text-text-secondary text-xl mb-4 leading-relaxed">
          Transform deed creation with AI assistance, seamless SoftPro & Qualia integrations, 
          and an enterprise API that connects your entire workflow.
        </p>
        
        <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
          <span className="bg-surface text-text-secondary px-3 py-1 rounded-full text-sm font-medium border border-silver flex items-center gap-1">
            <SparklesIcon className="h-4 w-4 icon" /> AI Wizard
          </span>
          <span className="bg-surface text-text-secondary px-3 py-1 rounded-full text-sm font-medium border border-silver flex items-center gap-1">
            <BuildingOfficeIcon className="h-4 w-4 icon" /> API Integrations
          </span>
          <span className="bg-tertiary text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 shadow-lg">
            <BuildingOfficeIcon className="h-4 w-4" /> Enterprise Ready
          </span>
          <span className="bg-surface text-text-secondary px-3 py-1 rounded-full text-sm font-medium border border-silver flex items-center gap-1">
            <DevicePhoneMobileIcon className="h-4 w-4 icon" /> iPhone-Style UX
          </span>
        </div>
        
        <div className="flex gap-4 flex-wrap justify-center lg:justify-start mb-8">
          <a 
            href="/create-deed" 
            className="bg-tertiary text-primary px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-secondary transition-all transform hover:scale-105 font-semibold text-lg"
          >
            Try AI Wizard →
          </a>
          <a 
            href="#api" 
            className="bg-surface text-text-primary px-8 py-4 rounded-xl hover:bg-silver hover:text-tertiary transition-all font-semibold text-lg border border-silver"
          >
            Explore API
          </a>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center lg:justify-start text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="text-tertiary">✅</span>
            <span>Trusted by 1,200+ escrow officers</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-primary">🔗</span>
            <span>Integrates with SoftPro & Qualia</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-tertiary">⚡</span>
            <span>99.9% API uptime</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 mt-12 lg:mt-0 max-w-2xl">
        <div className="relative">
          {/* Main Dashboard Screenshot Placeholder */}
          <div className="bg-surface rounded-2xl shadow-2xl overflow-hidden border border-silver">
            <div className="bg-primary h-8 flex items-center justify-start px-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-tertiary rounded-full"></div>
              </div>
              <div className="flex-1 text-center text-silver text-xs">DeedPro AI Wizard</div>
            </div>
            <div className="p-8 h-96 flex flex-col items-center justify-center text-text-secondary">
              <div className="text-6xl mb-4">🏠</div>
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">AI-Enhanced Deed Wizard</div>
                <div className="text-sm">Interactive cards • Smart tooltips • Real-time assistance</div>
              </div>
              <div className="mt-6 flex gap-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-secondary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-3 h-3 bg-tertiary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          </div>
          
          {/* Floating API badge */}
          <div className="absolute -top-4 -right-4 bg-tertiary text-primary px-4 py-2 rounded-lg shadow-lg transform rotate-12 hover:rotate-0 transition-transform">
            <div className="text-xs font-bold">API READY</div>
            <div className="text-xs">RESTful + GraphQL</div>
          </div>
          
          {/* Integration badges */}
          <div className="absolute -bottom-6 -left-4 bg-surface rounded-lg shadow-lg p-3 border border-silver">
            <div className="text-xs text-text-secondary mb-1">Integrates with:</div>
            <div className="flex gap-2">
              <span className="bg-background text-primary px-2 py-1 rounded text-xs font-medium">SoftPro 360</span>
              <span className="bg-background text-secondary px-2 py-1 rounded text-xs font-medium">Qualia</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 