'use client';

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
    <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
            💎 Flexible Pricing
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-6">
            Choose Your DeedPro Plan
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            From individual professionals to enterprise integrations, we have a plan that scales with your business. 
            All plans include our AI-enhanced wizard and professional support.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div key={index} className={`relative p-8 rounded-3xl border-2 ${
              plan.popular 
                ? 'border-blue-500 shadow-2xl scale-105 bg-gradient-to-br from-blue-50 to-purple-50' 
                : 'border-gray-200 bg-white hover:shadow-xl'
            } transition-all duration-300`}>
              
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className={`px-6 py-2 rounded-full text-sm font-bold ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {plan.badge}
                </span>
              </div>
              
              <div className="text-center mb-8 pt-4">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-5xl font-bold text-gray-800">{plan.price}</span>
                  <span className="text-gray-500 ml-2 text-lg">{plan.period}</span>
                </div>
                {plan.name === "Starter" && (
                  <div className="text-sm text-green-600 font-semibold">14-day free trial</div>
                )}
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-500 mr-3 mt-1 text-lg">✓</span>
                    <span className="text-gray-700 leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all ${
                plan.popular 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transform hover:scale-105' 
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* API Comparison Table */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 text-center">
            <h3 className="text-2xl font-bold mb-2">API Features Comparison</h3>
            <p className="text-blue-100">Detailed breakdown of API capabilities across plans</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-800">Feature</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-800">Starter</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-800">Professional</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-800">Enterprise API</th>
                </tr>
              </thead>
              <tbody>
                {apiFeatures.map((row, index) => (
                  <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{row.feature}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{row.starter}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{row.professional}</td>
                    <td className="px-6 py-4 text-center text-gray-600">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Workflow?</h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                             Join over 1,200 escrow officers who have streamlined their deed creation process with DeedPro&apos;s AI-enhanced platform.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a href="/create-deed" className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">
                Try AI Wizard Free
              </a>
              <a href="#api" className="border-2 border-white text-white px-8 py-3 rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all">
                Explore API
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 