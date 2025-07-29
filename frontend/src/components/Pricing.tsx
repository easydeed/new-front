'use client';

import { CurrencyDollarIcon, CheckIcon } from '@heroicons/react/24/outline';

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
  // Fallback plans if API data isn't available
  const fallbackPlans = [
    {
      name: "Starter",
      price: 29,
      features: ["AI-Enhanced Deed Wizard", "Up to 50 deeds per month", "Smart tooltips & assistance", "iPhone-style interface", "Email support", "Basic analytics"],
      popular: false
    },
    {
      name: "Professional", 
      price: 89,
      features: ["Everything in Starter", "Unlimited deeds", "Advanced sharing & collaboration", "Priority AI assistance", "API access (100 calls/day)", "Priority support", "Advanced analytics"],
      popular: true
    },
    {
      name: "Enterprise",
      price: 299,
      features: ["Everything in Professional", "Unlimited API calls", "SoftPro 360 integration", "Qualia GraphQL sync", "Admin dashboard", "Custom webhooks", "Dedicated support", "99.9% SLA"],
      popular: false
    }
  ];

  const plans = pricing.length > 0 ? pricing : fallbackPlans;

  const apiFeatures = [
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
  ];

  return (
    <section className="py-20 px-6 bg-slate-navy">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block bg-electric-indigo text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center gap-2 w-fit mx-auto">
            <CurrencyDollarIcon className="h-4 w-4" />
            Flexible Pricing
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Choose Your DeedPro Plan
          </h2>
          <p className="text-aqua-mint max-w-3xl mx-auto text-lg">
            From individual professionals to enterprise integrations, we have a plan that scales with your business. 
            All plans include our AI-enhanced wizard and professional support.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative p-8 rounded-3xl border-2 ${
              plan.popular 
                ? 'border-tropical-teal shadow-2xl scale-105 bg-charcoal-blue ring-4 ring-tropical-teal/20' 
                : 'border-aqua-mint bg-charcoal-blue hover:shadow-xl hover:border-tropical-teal'
            } transition-all duration-300`}>
              
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="px-6 py-2 rounded-full text-sm font-bold bg-tropical-teal text-white shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8 pt-4">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-5xl font-bold text-white">${plan.price}</span>
                  <span className="text-aqua-mint ml-2 text-lg">/month</span>
                </div>
                {plan.name.toLowerCase() === "starter" && (
                  <div className="text-sm text-tropical-teal font-semibold">14-day free trial</div>
                )}
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 mt-1 flex-shrink-0 ${
                      plan.popular ? 'text-tropical-teal' : 'text-aqua-mint'
                    }`} />
                    <span className="text-white leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                plan.popular 
                  ? 'bg-tropical-teal text-white hover:shadow-lg transform hover:scale-105 hover:bg-aqua-mint' 
                  : 'bg-electric-indigo text-white hover:bg-tropical-teal'
              }`}>
                {plan.name.toLowerCase() === "enterprise" ? "Contact Sales" : "Get Started"}
              </button>
            </div>
          ))}
        </div>

        {/* API Comparison Table */}
        <div className="bg-charcoal-blue rounded-3xl shadow-xl overflow-hidden border border-tropical-teal">
          <div className="bg-slate-navy text-white p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">API Features Comparison</h3>
            <p className="text-aqua-mint">Detailed breakdown of API capabilities across plans</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-navy">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-white">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-white">Starter</th>
                  <th className="px-6 py-4 text-center font-semibold text-white bg-tropical-teal/10">Professional</th>
                  <th className="px-6 py-4 text-center font-semibold text-white">Enterprise API</th>
                </tr>
              </thead>
              <tbody>
                {apiFeatures.map((row, index) => (
                  <tr key={index} className="border-t border-aqua-mint/20 hover:bg-slate-navy transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{row.feature}</td>
                    <td className="px-6 py-4 text-center text-aqua-mint">{row.starter}</td>
                    <td className="px-6 py-4 text-center text-aqua-mint bg-tropical-teal/5 font-semibold">{row.professional}</td>
                    <td className="px-6 py-4 text-center text-aqua-mint">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-charcoal-blue rounded-3xl p-8 text-white border border-tropical-teal">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Workflow?</h3>
            <p className="text-aqua-mint mb-6 max-w-2xl mx-auto">
              Join over 1,200 escrow officers who have streamlined their deed creation process with DeedPro's AI-enhanced platform.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a href="/create-deed" className="bg-tropical-teal text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:bg-aqua-mint transition-all">
                Try AI Wizard Free
              </a>
              <a href="#api" className="border-2 border-aqua-mint text-aqua-mint px-8 py-3 rounded-xl font-bold hover:bg-electric-indigo hover:text-white hover:border-electric-indigo transition-all">
                Explore API
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 