'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';
import Particles from '@/components/Particles';

interface PricingPlan {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export default function Home() {
  const [pricing, setPricing] = useState<PricingPlan[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/pricing`);
        if (response.ok) {
          const data = await response.json();
          setPricing(data);
        }
      } catch (error) {
        console.error('Error fetching pricing:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchPricing();
  }, []);

  return (
    <div className="min-h-screen bg-light-seafoam text-dark-slate font-inter relative overflow-hidden dark:bg-charcoal-blue dark:text-white">
      {/* Subtle particle background */}
      <Particles />
      
      {/* Main content with enhanced animations */}
      <main className="relative z-10">
        <div className="animate-fade-in">
          <Navbar />
        </div>
        
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <Hero />
        </div>
        
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Features />
        </div>
        
        {/* Enhanced pricing section with subtle gradient background */}
        <div 
          className="relative py-20 bg-pale-slate animate-fade-in-up dark:bg-gradient-to-br dark:from-slate-navy dark:via-soft-charcoal dark:to-charcoal-blue"
          style={{ animationDelay: '0.3s' }}
        >
          {/* Background effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-deep-teal/10 rounded-full blur-3xl dark:bg-tropical-teal/5"></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gentle-indigo/10 rounded-full blur-3xl dark:bg-electric-indigo/5"></div>
          </div>
          
          <div className="relative z-10">
            {isLoaded ? (
              <Pricing pricing={pricing} />
            ) : (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-deep-teal border-t-transparent shadow-glow-teal dark:border-tropical-teal"></div>
              </div>
            )}
          </div>
        </div>
        
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Footer />
        </div>
      </main>

      {/* Floating action elements */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="group relative">
          <div className="absolute -inset-1 bg-gradient-teal rounded-full blur opacity-30 group-hover:opacity-75 transition duration-300"></div>
          <button className="relative bg-pale-slate border border-deep-teal/30 text-dark-slate p-4 rounded-full shadow-lg hover:shadow-glow-teal transition-all duration-300 hover:scale-110 dark:bg-gradient-dark dark:border-tropical-teal/30 dark:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
