'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';
// import Particles from '@/components/Particles';

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

  return (
    <div className="min-h-screen bg-light-seafoam text-dark-slate font-inter">
      <main className="relative z-10">
        <Navbar />
        <Hero />
        <Features />

        <section className="py-16 px-6">
            {isLoaded ? (
              <Pricing pricing={pricing} />
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
