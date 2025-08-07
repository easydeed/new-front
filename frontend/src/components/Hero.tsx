'use client';

import { useState, useEffect } from 'react';
import { RocketLaunchIcon, SparklesIcon, BuildingOfficeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { ArrowRight, Sparkles, Zap, Star } from './Icons';

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="min-h-screen flex flex-col lg:flex-row items-center justify-center px-6 bg-light-seafoam dark:bg-gradient-dark relative overflow-hidden">
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-tropical-teal/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-electric-indigo/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className={`flex-1 text-center lg:text-left max-w-3xl lg:pr-12 relative z-10 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Enhanced badge */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <span className="inline-flex items-center justify-center lg:justify-start gap-2 bg-gradient-dark border border-tropical-teal/30 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-glow-teal hover:shadow-glow-teal transition-all duration-300 hover:scale-105 group">
            <RocketLaunchIcon className="h-5 w-5 text-tropical-teal group-hover:animate-bounce-subtle" />
            <span className="bg-gradient-teal bg-clip-text text-transparent">AI-Powered</span>
            <span className="text-aqua-mint">•</span>
            <span className="bg-gradient-indigo bg-clip-text text-transparent">Enterprise Ready</span>
            <Sparkles className="h-4 w-4 text-electric-indigo" />
          </span>
        </div>
        
        {/* Enhanced main title */}
        <h1 className="text-6xl lg:text-8xl font-bold text-dark-slate dark:text-white leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <span className="relative">
            Deed
            <div className="absolute -top-2 -right-6">
              <Star className="h-8 w-8 text-deep-teal dark:text-tropical-teal animate-pulse" />
            </div>
          </span>
          <span className="bg-gradient-animated bg-gradient-teal bg-clip-text text-transparent animate-gradient-shift" style={{ backgroundSize: '400% 400%' }}>
            Pro
          </span>
        </h1>
        
        {/* Enhanced subtitle with dual-audience messaging */}
        <h2 className="text-3xl lg:text-5xl font-bold text-dark-slate dark:text-white leading-tight mb-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          Streamline Deeds for Businesses and Independents
          <br />
          <span className="text-gentle-indigo dark:text-aqua-mint text-2xl lg:text-3xl">AI-Enhanced • Enterprise Ready</span>
        </h2>
        
        {/* Enhanced description for dual audiences */}
        <p className="text-dark-slate/80 dark:text-aqua-mint text-xl mb-6 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          Perfect for <span className="text-deep-teal dark:text-tropical-teal font-semibold">independent escrow officers</span> and 
          <span className="text-gentle-indigo dark:text-electric-indigo font-semibold"> enterprise teams</span>. 
          Features <span className="text-dark-slate dark:text-white font-semibold">AI assistance</span>, 
          seamless integrations, and scalable API access.
        </p>
        
        {/* Enhanced feature badges */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '1s' }}>
          <span className="group bg-soft-charcoal text-white px-4 py-2 rounded-full text-sm font-medium border border-tropical-teal/30 flex items-center gap-2 hover:bg-tropical-teal/10 hover:scale-105 transition-all duration-300">
            <SparklesIcon className="h-4 w-4 text-tropical-teal group-hover:animate-spin" />
            AI Wizard
          </span>
          <span className="group bg-soft-charcoal text-white px-4 py-2 rounded-full text-sm font-medium border border-electric-indigo/30 flex items-center gap-2 hover:bg-electric-indigo/10 hover:scale-105 transition-all duration-300">
            <BuildingOfficeIcon className="h-4 w-4 text-electric-indigo group-hover:animate-bounce-subtle" />
            API Integrations
          </span>
          <span className="group bg-gradient-indigo text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-glow-indigo hover:shadow-glow-mint hover:scale-105 transition-all duration-300">
            <Zap className="h-4 w-4" />
            Enterprise Ready
          </span>
          <span className="group bg-soft-charcoal text-white px-4 py-2 rounded-full text-sm font-medium border border-aqua-mint/30 flex items-center gap-2 hover:bg-aqua-mint/10 hover:scale-105 transition-all duration-300">
            <DevicePhoneMobileIcon className="h-4 w-4 text-aqua-mint group-hover:animate-pulse" />
            iPhone-Style UX
          </span>
        </div>
        
        {/* Enhanced CTA buttons */}
        <div className="flex gap-4 flex-wrap justify-center lg:justify-start mb-8 animate-fade-in-up" style={{ animationDelay: '1.2s' }}>
          <a 
            href="/create-deed" 
            className="group bg-gradient-teal text-white px-8 py-4 rounded-2xl shadow-elevated hover:shadow-glow-teal transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 font-semibold text-lg flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Try AI Wizard
            <ArrowRight className="h-5 w-5" />
          </a>
          <a 
            href="#api" 
            className="group bg-soft-charcoal text-white px-8 py-4 rounded-2xl hover:bg-gradient-indigo transition-all duration-300 font-semibold text-lg border border-tropical-teal/30 hover:border-electric-indigo flex items-center gap-2 hover:scale-105"
          >
            Explore API
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
        
        {/* Enhanced stats */}
        <div className="flex flex-col sm:flex-row gap-6 items-center justify-center lg:justify-start text-sm text-aqua-mint animate-fade-in-up" style={{ animationDelay: '1.4s' }}>
          <div className="flex items-center gap-2 group hover:scale-105 transition-transform duration-300">
            <div className="w-2 h-2 bg-tropical-teal rounded-full animate-pulse"></div>
            <span>Trusted by <span className="text-white font-semibold">1,200+</span> escrow officers</span>
          </div>
          <div className="flex items-center gap-2 group hover:scale-105 transition-transform duration-300">
            <div className="w-2 h-2 bg-electric-indigo rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <span>Integrates with <span className="text-white font-semibold">SoftPro & Qualia</span></span>
          </div>
          <div className="flex items-center gap-2 group hover:scale-105 transition-transform duration-300">
            <div className="w-2 h-2 bg-aqua-mint rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <span><span className="text-white font-semibold">99.9%</span> API uptime</span>
          </div>
        </div>
      </div>
      
      {/* Enhanced right side showcase */}
      <div className="flex-1 mt-12 lg:mt-0 max-w-2xl relative z-10 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
        <div className="relative">
          
          {/* Enhanced main dashboard */}
          <div className="bg-gradient-dark rounded-3xl shadow-elevated overflow-hidden border border-tropical-teal/30 group hover:shadow-glow-teal transition-all duration-500">
            <div className="bg-charcoal-blue h-12 flex items-center justify-start px-6 border-b border-tropical-teal/20">
              <div className="flex gap-3">
                <div className="w-3 h-3 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"></div>
                <div className="w-3 h-3 bg-yellow-500/80 rounded-full hover:bg-yellow-500 transition-colors"></div>
                <div className="w-3 h-3 bg-tropical-teal rounded-full hover:bg-aqua-mint transition-colors"></div>
              </div>
              <div className="flex-1 text-center text-aqua-mint text-sm font-medium">DeedPro AI Wizard</div>
            </div>
            <div className="p-8 h-96 flex flex-col items-center justify-center text-white relative overflow-hidden">
              
              {/* Background tech pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-4 w-16 h-16 border border-tropical-teal rounded-lg rotate-12"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border border-electric-indigo rounded-full"></div>
                <div className="absolute top-1/2 left-1/3 w-8 h-8 border border-aqua-mint transform rotate-45"></div>
              </div>
              
              <div className="text-6xl mb-6 animate-bounce-subtle">🏠</div>
              <div className="text-center z-10">
                <div className="text-2xl font-bold mb-3 bg-gradient-teal bg-clip-text text-transparent">AI-Enhanced Deed Wizard</div>
                <div className="text-aqua-mint mb-6">Interactive cards • Smart tooltips • Real-time assistance</div>
                
                {/* Enhanced progress dots */}
                <div className="flex gap-3 justify-center">
                  <div className="w-3 h-3 bg-tropical-teal rounded-full animate-pulse shadow-glow-teal"></div>
                  <div className="w-3 h-3 bg-aqua-mint rounded-full animate-pulse shadow-glow-mint" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-3 h-3 bg-electric-indigo rounded-full animate-pulse shadow-glow-indigo" style={{ animationDelay: '0.6s' }}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced floating badges */}
          <div className="absolute -top-6 -right-6 bg-gradient-indigo text-white px-6 py-3 rounded-2xl shadow-glow-indigo transform rotate-12 hover:rotate-6 transition-transform duration-300 group">
            <div className="text-xs font-bold flex items-center gap-2">
              <Zap className="h-4 w-4" />
              API READY
            </div>
            <div className="text-xs opacity-90">RESTful + GraphQL</div>
          </div>
          
          {/* Enhanced integration showcase */}
          <div className="absolute -bottom-8 -left-6 bg-gradient-dark rounded-2xl shadow-elevated p-4 border border-tropical-teal/30 hover:shadow-glow-teal transition-all duration-300">
            <div className="text-xs text-aqua-mint mb-2 font-medium">Integrates with:</div>
            <div className="flex gap-2">
              <span className="bg-charcoal-blue text-tropical-teal px-3 py-1 rounded-lg text-xs font-medium border border-tropical-teal/30 hover:bg-tropical-teal/10 transition-colors">
                SoftPro 360
              </span>
              <span className="bg-charcoal-blue text-electric-indigo px-3 py-1 rounded-lg text-xs font-medium border border-electric-indigo/30 hover:bg-electric-indigo/10 transition-colors">
                Qualia
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 