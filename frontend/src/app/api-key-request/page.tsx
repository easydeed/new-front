'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApiKeyRequest() {
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    use_case: '',
    expected_volume: '',
    integration_timeline: '',
    business_type: 'independent',
    has_current_software: '',
    current_software: '',
    additional_info: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In production, send to backend:
    // const response = await fetch('/api/request-api-key', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(formData)
    // });

    setSubmitted(true);
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-light-seafoam flex items-center justify-center px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-dark-slate mb-6">
              Request Submitted Successfully!
            </h1>
            <p className="text-dark-slate/80 text-lg mb-8">
              Thank you for your interest in DeedPro&#39;s API. Our team will review your request and get back to you within 24 hours.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-dark-slate mb-4">📧 What happens next?</h3>
              <div className="text-left space-y-2 text-dark-slate/80">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <span>Technical review of your use case (within 4 hours)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <span>API key generation and documentation package</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <span>Onboarding call to discuss integration strategy</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <span>Dedicated support during implementation</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push('/docs')}
                className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                📚 Browse Documentation
              </button>
              <button
                onClick={() => router.push('/team')}
                className="bg-tertiary text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                👥 Explore Team Features
              </button>
              <button
                onClick={() => router.push('/')}
                className="border-2 border-gray-300 text-dark-slate px-6 py-3 rounded-lg font-semibold hover:border-tertiary hover:text-tertiary transition-colors"
              >
                🏠 Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-seafoam py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-dark-slate mb-6">
            🔑 Request API Access
          </h1>
          <p className="text-xl text-dark-slate/80 max-w-3xl mx-auto">
            Get started with DeedPro&#39;s enterprise API platform. We&#39;ll set you up with everything you need for seamless integration.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: '⚡',
              title: 'Fast Setup',
              description: 'API key delivered within 24 hours with complete documentation'
            },
            {
              icon: '🔒',
              title: 'Enterprise Security',
              description: 'SOC2 compliant with role-based permissions and audit logging'
            },
            {
              icon: '🎯',
              title: 'Dedicated Support',
              description: 'Personal onboarding and ongoing technical assistance'
            }
          ].map((benefit, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="text-4xl mb-4">{benefit.icon}</div>
              <h3 className="font-bold text-dark-slate mb-2">{benefit.title}</h3>
              <p className="text-dark-slate/70 text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div>
              <h3 className="text-xl font-bold text-dark-slate mb-4">🏢 Company Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-dark-slate mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                    placeholder="ABC Escrow Services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-slate mb-2">
                    Business Type *
                  </label>
                  <select
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="independent">Independent Escrow Officer</option>
                    <option value="title_company">Title Company</option>
                    <option value="law_firm">Law Firm</option>
                    <option value="real_estate_company">Real Estate Company</option>
                    <option value="software_vendor">Software Vendor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-xl font-bold text-dark-slate mb-4">👤 Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-dark-slate mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-slate mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                    placeholder="john@abcescrow.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-dark-slate mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Integration Details */}
            <div>
              <h3 className="text-xl font-bold text-dark-slate mb-4">🔗 Integration Details</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-dark-slate mb-2">
                    Primary Use Case *
                  </label>
                  <textarea
                    name="use_case"
                    value={formData.use_case}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                    placeholder="Describe how you plan to use the DeedPro API (e.g., integrate with SoftPro, automate deed generation, etc.)"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-dark-slate mb-2">
                      Expected Monthly Volume
                    </label>
                    <select
                      name="expected_volume"
                      value={formData.expected_volume}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select volume</option>
                      <option value="1-50">1-50 deeds</option>
                      <option value="51-200">51-200 deeds</option>
                      <option value="201-500">201-500 deeds</option>
                      <option value="501-1000">501-1000 deeds</option>
                      <option value="1000+">1000+ deeds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-dark-slate mb-2">
                      Integration Timeline
                    </label>
                    <select
                      name="integration_timeline"
                      value={formData.integration_timeline}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select timeline</option>
                      <option value="immediate">Immediate (this week)</option>
                      <option value="1-month">Within 1 month</option>
                      <option value="3-months">Within 3 months</option>
                      <option value="6-months">Within 6 months</option>
                      <option value="planning">Planning/research phase</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Software */}
            <div>
              <h3 className="text-xl font-bold text-dark-slate mb-4">💻 Current Software</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-slate mb-2">
                    Do you currently use escrow/title software?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="has_current_software"
                        value="yes"
                        checked={formData.has_current_software === 'yes'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="has_current_software"
                        value="no"
                        checked={formData.has_current_software === 'no'}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                </div>
                {formData.has_current_software === 'yes' && (
                  <div>
                    <label className="block text-sm font-semibold text-dark-slate mb-2">
                      Current Software
                    </label>
                    <input
                      type="text"
                      name="current_software"
                      value={formData.current_software}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                      placeholder="SoftPro 360, Qualia, RamQuest, etc."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-xl font-bold text-dark-slate mb-4">📝 Additional Information</h3>
              <textarea
                name="additional_info"
                value={formData.additional_info}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-tertiary focus:ring-2 focus:ring-blue-100"
                placeholder="Any additional information about your integration needs, special requirements, or questions for our team..."
              />
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting Request...
                    </>
                  ) : (
                    '🚀 Submit API Request'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/docs')}
                  className="border-2 border-gray-300 text-dark-slate px-8 py-4 rounded-lg font-semibold hover:border-tertiary hover:text-tertiary transition-colors"
                >
                  📚 View Documentation First
                </button>
              </div>
              <p className="text-sm text-dark-slate/60 mt-4">
                * Required fields. We respect your privacy and will only use this information to provide API access and support.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
