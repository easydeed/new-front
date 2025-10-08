'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Current components
import HeroCurrent from '@/components/Hero';
import FeaturesCurrent from '@/components/Features';
import PricingCurrent from '@/components/Pricing';

// Phase 9 Escrow components
import HeroEscrow from '@/components/escrow/Hero';
import WhyTiles from '@/components/escrow/WhyTiles';
import WorkflowStrip from '@/components/escrow/WorkflowStrip';
import IntegrationsSection from '@/components/escrow/IntegrationsSection';
import DevelopersSection from '@/components/escrow/DevelopersSection';
import StickyActionBar from '@/components/escrow/StickyActionBar';

interface PricingPlan {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export default function Home() {
  const [pricing, setPricing] = useState<PricingPlan[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Feature flag for Phase 9
  const enablePhase9 = process.env.NEXT_PUBLIC_ENABLE_PHASE9 === 'true';

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com'}/pricing`);
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

  // Phase 9: Escrow-first UI
  if (enablePhase9) {
    return (
      <div className="escrow min-h-screen font-inter">
        <main className="relative z-10">
          <Navbar />
          <HeroEscrow />
          <WhyTiles />
          <WorkflowStrip />
          <IntegrationsSection />
          <DevelopersSection />
          
          <section className="py-16 px-6">
            {isLoaded ? (
              <PricingCurrent pricing={pricing} />
            ) : (
              <div className="flex justify-center items-center py-16">
                <div className="h-10 w-10 rounded-full border-2 border-dark-slate/20 border-t-transparent animate-spin" />
              </div>
            )}
          </section>
          
          <Footer />
        </main>
        
        <StickyActionBar />
      </div>
    );
  }

  // Current UI (default)
  return (
    <div className="min-h-screen bg-light-seafoam text-dark-slate font-inter">
      <main className="relative z-10">
        <Navbar />
        <HeroCurrent />
        <FeaturesCurrent />

        <section className="py-16 px-6">
          {isLoaded ? (
            <PricingCurrent pricing={pricing} />
          ) : (
            <div className="flex justify-center items-center py-16">
              <div className="h-10 w-10 rounded-full border-2 border-dark-slate/20 border-t-transparent animate-spin" />
            </div>
          )}
        </section>

        <Footer />
      </main>
    </div>
  );
}
