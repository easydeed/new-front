'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function DocsIndex() {
  const router = useRouter();

  const documentationSections = [
    {
      title: '📋 API Reference',
      description: 'Complete documentation of all REST API endpoints with examples',
      path: '/docs/API_REFERENCE',
      icon: '🔗',
      popular: true
    },
    {
      title: '🏗️ Frontend Architecture', 
      description: 'Component structure, design system, and development guide',
      path: '/docs/FRONTEND_ARCHITECTURE',
      icon: '⚛️',
      popular: false
    },
    {
      title: '🖥️ Backend Architecture',
      description: 'FastAPI application structure, database, and integrations',
      path: '/docs/BACKEND_ARCHITECTURE', 
      icon: '🐍',
      popular: false
    },
    {
      title: '🗄️ Database Schema',
      description: 'Complete database structure and relationships',
      path: '/docs/DATABASE_SCHEMA',
      icon: '💾',
      popular: false
    },
    {
      title: '✨ AI Features Guide',
      description: 'AI-enhanced deed generation and smart assistance',
      path: '/docs/AI_FEATURES_GUIDE',
      icon: '🤖',
      popular: true
    },
    {
      title: '👤 AI User Guide',
      description: 'Step-by-step guide for users to leverage AI features',
      path: '/docs/AI_USER_GUIDE',
      icon: '📖',
      popular: true
    },
    {
      title: '📚 User Onboarding',
      description: 'Complete training materials and certification program',
      path: '/docs/USER_ONBOARDING_GUIDE',
      icon: '🎓',
      popular: false
    },
    {
      title: '🔄 Deed Wizard Flow',
      description: 'Address-first deed creation workflow documentation',
      path: '/docs/DEED_WIZARD_FLOW',
      icon: '🪄',
      popular: false
    },
    {
      title: '🚀 Deployment Guide',
      description: 'Production deployment checklist and verification',
      path: '/docs/DEPLOYMENT_CHECKLIST',
      icon: '⚙️',
      popular: false
    },
    {
      title: '🤖 AI Deployment',
      description: 'Database schema updates and AI system deployment',
      path: '/docs/AI_DEPLOYMENT_GUIDE',
      icon: '🚀',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-light-seafoam">
      {/* Header */}
      <div className="bg-primary text-white py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            📚 DeedPro Documentation
          </h1>
          <p className="text-xl lg:text-2xl text-blue-100 max-w-4xl mx-auto mb-8">
            Everything you need to integrate, develop, and master DeedPro&#39;s AI-enhanced deed creation platform
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => router.push('/docs/API_REFERENCE')}
              className="bg-white text-primary px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              🚀 Quick Start Guide
            </button>
            <button
              onClick={() => router.push('/docs/AI_FEATURES_GUIDE')}
              className="bg-tertiary text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              ✨ AI Features
            </button>
            <button
              onClick={() => router.push('/api-key-request')}
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors"
            >
              🔑 Get API Key
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-slate mb-4">
              📖 Documentation Sections
            </h2>
            <p className="text-dark-slate/80 text-lg max-w-3xl mx-auto">
              Comprehensive guides for developers, users, and administrators
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentationSections.map((section, index) => (
              <div
                key={index}
                onClick={() => router.push(section.path)}
                className={`
                  relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl
                  ${section.popular 
                    ? 'border-tertiary bg-white shadow-lg' 
                    : 'border-gray-200 bg-white hover:border-tertiary'
                  }
                `}
              >
                {section.popular && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-tertiary text-white px-2 py-1 rounded-full text-xs font-semibold">
                      Popular
                    </span>
                  </div>
                )}
                
                <div className="text-4xl mb-4">{section.icon}</div>
                <h3 className="text-xl font-bold text-dark-slate mb-3">
                  {section.title}
                </h3>
                <p className="text-dark-slate/70 leading-relaxed">
                  {section.description}
                </p>
                
                <div className="mt-4 flex items-center text-tertiary font-semibold">
                  <span>Read more</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Quick Reference */}
      <div className="py-16 px-6 bg-pale-slate">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-slate mb-4">
              🔗 Quick API Reference
            </h2>
            <p className="text-dark-slate/80 text-lg">
              Essential endpoints to get you started
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-primary rounded-2xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">🎯 Core Endpoints</h3>
              <div className="space-y-3 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-green-300">POST</span>
                  <span>/api/generate-deed-preview</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-300">GET</span>
                  <span>/api/users/profile/enhanced</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-300">PUT</span>
                  <span>/api/users/profile/enhanced</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-300">POST</span>
                  <span>/api/ai/deed-suggestions</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-dark-slate mb-4">🔑 Authentication</h3>
              <div className="text-sm">
                <p className="text-dark-slate/70 mb-4">
                  All API requests require authentication via API key in the header:
                </p>
                <div className="bg-gray-100 rounded-lg p-3 font-mono text-xs">
                  <div className="text-gray-600">Authorization: Bearer your_api_key</div>
                  <div className="text-gray-600">Content-Type: application/json</div>
                </div>
                <button
                  onClick={() => router.push('/api-key-request')}
                  className="mt-4 bg-tertiary text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors w-full"
                >
                  Request API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-dark-slate mb-6">
            🆘 Need Help?
          </h2>
          <p className="text-dark-slate/80 text-lg mb-8">
            Our team is here to help you integrate and succeed with DeedPro
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-gray-200 bg-white">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="font-bold text-dark-slate mb-2">Live Chat</h3>
              <p className="text-dark-slate/70 text-sm mb-4">
                Real-time support during business hours
              </p>
              <button className="bg-primary text-white px-4 py-2 rounded-lg font-semibold w-full">
                Start Chat
              </button>
            </div>
            <div className="p-6 rounded-xl border border-gray-200 bg-white">
              <div className="text-3xl mb-4">📧</div>
              <h3 className="font-bold text-dark-slate mb-2">Email Support</h3>
              <p className="text-dark-slate/70 text-sm mb-4">
                Detailed technical assistance
              </p>
              <button className="bg-tertiary text-white px-4 py-2 rounded-lg font-semibold w-full">
                Send Email
              </button>
            </div>
            <div className="p-6 rounded-xl border border-gray-200 bg-white">
              <div className="text-3xl mb-4">🎥</div>
              <h3 className="font-bold text-dark-slate mb-2">Video Call</h3>
              <p className="text-dark-slate/70 text-sm mb-4">
                Screen sharing and live demos
              </p>
              <button className="bg-secondary text-white px-4 py-2 rounded-lg font-semibold w-full">
                Schedule Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
