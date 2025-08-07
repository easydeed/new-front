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
    <section className="py-20 px-6 bg-pale-slate dark:bg-slate-navy">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block bg-gentle-indigo dark:bg-electric-indigo text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center gap-2 w-fit mx-auto">
            <CurrencyDollarIcon className="h-4 w-4" />
            Flexible Pricing
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-dark-slate dark:text-white mb-6">
            Choose Your DeedPro Plan
          </h2>
          <p className="text-dark-slate/80 dark:text-aqua-mint max-w-3xl mx-auto text-lg">
            Perfect for <span className="text-deep-teal dark:text-tropical-teal font-semibold">independent escrow officers</span> and 
            <span className="text-gentle-indigo dark:text-electric-indigo font-semibold"> enterprise teams</span>. 
            All plans include our AI-enhanced wizard and professional support.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative p-8 rounded-3xl border-2 ${
              plan.popular 
                ? 'border-deep-teal dark:border-tropical-teal shadow-2xl scale-105 bg-light-seafoam dark:bg-charcoal-blue ring-4 ring-deep-teal/20 dark:ring-tropical-teal/20' 
                : 'border-gentle-indigo/30 dark:border-aqua-mint bg-light-seafoam dark:bg-charcoal-blue hover:shadow-xl hover:border-deep-teal dark:hover:border-tropical-teal'
            } transition-all duration-300`}>
              
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="px-6 py-2 rounded-full text-sm font-bold bg-tropical-teal text-white shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8 pt-4">
                <h3 className="text-2xl font-bold text-dark-slate dark:text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-5xl font-bold text-dark-slate dark:text-white">${plan.price}</span>
                  <span className="text-dark-slate/70 dark:text-aqua-mint ml-2 text-lg">/month</span>
                </div>
                {plan.name.toLowerCase() === "solo" && (
                  <div className="text-sm text-deep-teal dark:text-tropical-teal font-semibold">Always free for independents</div>
                )}
                {plan.name.toLowerCase() === "pro" && (
                  <div className="text-sm text-deep-teal dark:text-tropical-teal font-semibold">14-day free trial</div>
                )}
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 mt-1 flex-shrink-0 ${
                      plan.popular ? 'text-deep-teal dark:text-tropical-teal' : 'text-gentle-indigo dark:text-aqua-mint'
                    }`} />
                    <span className="text-dark-slate dark:text-white leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                plan.popular 
                  ? 'bg-deep-teal dark:bg-tropical-teal text-white hover:shadow-lg transform hover:scale-105 hover:bg-soft-cyan dark:hover:bg-aqua-mint' 
                  : 'bg-gentle-indigo dark:bg-electric-indigo text-white hover:bg-deep-teal dark:hover:bg-tropical-teal'
              }`}>
                {plan.name.toLowerCase() === "business" ? "Contact Sales" : "Get Started"}
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