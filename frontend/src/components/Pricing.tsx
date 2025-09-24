'use client';

import { CurrencyDollarIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface PricingPlan {
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}

interface PricingProps {
  pricing?: PricingPlan[];
}

export default function Pricing({ pricing = [] }: PricingProps) {
  const router = useRouter();
  
  // Fallback plans adjusted for dual audiences (independents + enterprises)
  const fallbackPlans = [
    {
      name: "Solo",
      price: 0,
      features: ["5 deeds per month", "AI-Enhanced Deed Wizard", "Basic templates", "Smart tooltips & assistance", "iPhone-style interface", "Email support", "Perfect for independent escrow officers"],
      popular: false
    },
    {
      name: "Pro", 
      price: 29,
      features: ["Unlimited deeds", "Advanced templates", "AI-powered suggestions", "Document sharing", "Priority support", "Advanced analytics", "SoftPro integration", "Ideal for growing businesses"],
      popular: true
    },
    {
      name: "Business",
      price: 99,
      features: ["Everything in Pro", "Unlimited API calls", "Team management", "Custom templates", "Qualia GraphQL sync", "Admin dashboard", "Custom webhooks", "99.9% SLA", "White-label option"],
      popular: false
    }
  ];

  const plans = pricing.length > 0 ? pricing : fallbackPlans;

  /* const apiFeatures = [
    {
      feature: "REST API Endpoints",
      starter: "❌",
      professional: "100/day",
      enterprise: "Unlimited"
    },
    {
      feature: "SoftPro 360 Integration",
      starter: "❌",
      professional: "❌", 
      enterprise: "✅"
    },
    {
      feature: "Qualia GraphQL Sync",
      starter: "❌",
      professional: "❌",
      enterprise: "✅"
    },
    {
      feature: "Custom Webhooks",
      starter: "❌",
      professional: "Basic",
      enterprise: "Advanced"
    },
    {
      feature: "API Documentation",
      starter: "❌",
      professional: "✅",
      enterprise: "✅ + Support"
    }
  ]; */

  return (
    <section className="py-16 px-6 bg-pale-slate">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-tertiary text-white px-4 py-2 rounded-full text-sm font-semibold w-fit mx-auto shadow-lg">
            <CurrencyDollarIcon className="h-4 w-4" />
            Flexible Pricing
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-dark-slate mb-4">
            Choose Your DeedPro Plan
          </h2>
          <p className="text-dark-slate/80 max-w-3xl mx-auto text-base">
            Perfect for <span className="text-gentle-indigo font-semibold">independent escrow officers</span> and 
            <span className="text-gentle-indigo font-semibold"> enterprise teams</span>. 
            All plans include our AI-enhanced wizard and professional support.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, index) => (
            <div key={index} className={`relative p-6 rounded-2xl border ${
              plan.popular 
                ? 'border-gentle-indigo bg-surface' 
                : 'border-dark-slate/10 bg-surface'
            }`}>
              
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gentle-indigo text-white">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-6 pt-2">
                <h3 className="text-xl font-semibold text-dark-slate mb-1">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-1">
                  <span className="text-4xl font-bold text-dark-slate">${plan.price}</span>
                  <span className="text-dark-slate/70 ml-2 text-sm">/month</span>
                </div>
                {plan.name.toLowerCase() === "solo" && (
                  <div className="text-xs text-gentle-indigo font-medium">Always free for independents</div>
                )}
                {plan.name.toLowerCase() === "pro" && (
                  <div className="text-xs text-gentle-indigo font-medium">14-day free trial</div>
                )}
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${
                      plan.popular ? 'text-gentle-indigo' : 'text-dark-slate/40'
                    }`} />
                    <span className="text-dark-slate leading-relaxed text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={() => {
                  if (plan.name.toLowerCase() === "business") {
                    router.push('/api-key-request');
                  } else if (plan.name.toLowerCase() === "solo") {
                    router.push('/create-deed');
                  } else {
                    router.push('/login?plan=' + plan.name.toLowerCase());
                  }
                }}
                className={`w-full py-3 px-5 rounded-xl font-medium text-sm hover:transform hover:scale-105 transition-all duration-200 ${
                  plan.popular 
                    ? 'bg-gentle-indigo text-white hover:bg-blue-600' 
                    : 'bg-surface text-dark-slate border border-dark-slate/10 hover:border-gentle-indigo hover:text-gentle-indigo'
                }`}
              >
                {plan.name.toLowerCase() === "business" ? "Contact Sales" : "Get Started"}
              </button>
            </div>
          ))}
        </div>

        {/* API Comparison Table removed for flatter, simpler layout */}

        {/* CTA Section */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold text-dark-slate mb-3">Ready to Transform Your Workflow?</h3>
          <p className="text-dark-slate/70 mb-5 max-w-2xl mx-auto">
            Join over 1,200 escrow officers who have streamlined their deed creation process with DeedPro&#39;s AI-enhanced platform.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button 
              onClick={() => router.push('/create-deed')}
              className="bg-gentle-indigo text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Try AI Wizard Free
            </button>
            <button 
              onClick={() => router.push('/docs/API_REFERENCE')}
              className="bg-surface text-dark-slate border border-dark-slate/10 px-6 py-3 rounded-xl text-sm font-medium hover:border-gentle-indigo hover:text-gentle-indigo transition-colors"
            >
              Explore API
            </button>
          </div>
        </div>
      </div>
    </section>
  );
} 