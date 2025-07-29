'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';

interface PricingPlan {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

export default function Home() {
  const [pricing, setPricing] = useState<PricingPlan[]>([]);

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
      }
    };

    fetchPricing();
  }, []);

  return (
    <main className="min-h-screen bg-charcoal-blue">
      <Navbar />
      <Hero />
      <Features />
      <Pricing pricing={pricing} />
      <Footer />
    </main>
  );
}
