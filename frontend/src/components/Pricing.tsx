'use client';

import { CurrencyDollarIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "/month",
      description: "Perfect for individual escrow officers",
      features: [
        "AI-Enhanced Deed Wizard",
        "Up to 50 deeds per month",
        "Smart tooltips & assistance",
        "iPhone-style interface",
        "Email support",
        "Basic analytics"
      ],
      cta: "Start Free Trial",
      popular: false,
      badge: "Individual"
    },
    {
      name: "Professional",
      price: "$89",
      period: "/month",
      description: "For busy real estate professionals",
      features: [
        "Everything in Starter",
        "Unlimited deeds",
        "Advanced sharing & collaboration",
        "Priority AI assistance",
        "API access (100 calls/day)",
        "Priority support",
        "Advanced analytics"
      ],
      cta: "Get Started",
      popular: true,
      badge: "Most Popular"
    },
    {
      name: "Enterprise API",
      price: "$299",
      period: "/month",
      description: "Full platform with API integrations",
      features: [
        "Everything in Professional",
        "Unlimited API calls",
        "SoftPro 360 integration",
        "Qualia GraphQL sync",
        "Admin dashboard",
        "Custom webhooks",
        "Dedicated support",
        "99.9% SLA"
      ],
      cta: "Contact Sales",
      popular: false,
      badge: "API Access"
    }
  ];

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
    <section className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block bg-tertiary text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4 flex items-center gap-2 w-fit mx-auto">
            <CurrencyDollarIcon className="h-4 w-4" />
            Flexible Pricing
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
            Choose Your DeedPro Plan
          </h2>
          <p className="text-text-secondary max-w-3xl mx-auto text-lg">
            From individual professionals to enterprise integrations, we have a plan that scales with your business. 
            All plans include our AI-enhanced wizard and professional support.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative p-8 rounded-3xl border-2 ${
              plan.popular 
                ? 'border-tertiary shadow-2xl scale-105 bg-surface ring-4 ring-tertiary/20' 
                : 'border-silver bg-surface hover:shadow-xl hover:border-secondary'
            } transition-all duration-300`}>
              
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className={`px-6 py-2 rounded-full text-sm font-bold ${
                  plan.popular 
                    ? 'bg-tertiary text-primary shadow-lg' 
                    : 'bg-background text-text-secondary border border-silver'
                }`}>
                  {plan.badge}
                </span>
              </div>
              
              <div className="text-center mb-8 pt-4">
                <h3 className="text-2xl font-bold text-text-primary mb-2">{plan.name}</h3>
                <p className="text-text-secondary mb-6">{plan.description}</p>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-5xl font-bold text-text-primary">{plan.price}</span>
                  <span className="text-text-secondary ml-2 text-lg">{plan.period}</span>
                </div>
                {plan.name === "Starter" && (
                  <div className="text-sm text-tertiary font-semibold">14-day free trial</div>
                )}
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckIcon className={`h-5 w-5 mr-3 mt-1 flex-shrink-0 ${
                      plan.popular ? 'text-tertiary' : 'text-secondary'
                    }`} />
                    <span className="text-text-secondary leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                plan.popular 
                  ? 'bg-tertiary text-primary hover:shadow-lg transform hover:scale-105 hover:bg-secondary' 
                  : 'bg-primary text-white hover:bg-secondary hover:text-primary'
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* API Comparison Table */}
        <div className="bg-surface rounded-3xl shadow-xl overflow-hidden border border-silver">
          <div className="bg-primary text-white p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">API Features Comparison</h3>
            <p className="text-silver">Detailed breakdown of API capabilities across plans</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-text-primary">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary">Starter</th>
                  <th className="px-6 py-4 text-center font-semibold text-primary bg-tertiary/10">Professional</th>
                  <th className="px-6 py-4 text-center font-semibold text-text-primary">Enterprise API</th>
                </tr>
              </thead>
              <tbody>
                {apiFeatures.map((row, index) => (
                  <tr key={index} className="border-t border-silver hover:bg-background transition-colors">
                    <td className="px-6 py-4 font-medium text-text-primary">{row.feature}</td>
                    <td className="px-6 py-4 text-center text-text-secondary">{row.starter}</td>
                    <td className="px-6 py-4 text-center text-text-secondary bg-tertiary/5 font-semibold">{row.professional}</td>
                    <td className="px-6 py-4 text-center text-text-secondary">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-primary rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Workflow?</h3>
            <p className="text-silver mb-6 max-w-2xl mx-auto">
              Join over 1,200 escrow officers who have streamlined their deed creation process with DeedPro&apos;s AI-enhanced platform.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a href="/create-deed" className="bg-tertiary text-primary px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:bg-secondary transition-all">
                Try AI Wizard Free
              </a>
              <a href="#api" className="border-2 border-silver text-silver px-8 py-3 rounded-xl font-bold hover:bg-surface hover:text-primary hover:border-tertiary transition-all">
                Explore API
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 