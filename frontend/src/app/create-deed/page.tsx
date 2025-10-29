'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import '../../styles/dashboard.css';
// ✅ PHASE 19 SESSION FIX: Import localStorage keys to clear when starting new deed
import { WIZARD_DRAFT_KEY_MODERN, WIZARD_DRAFT_KEY_CLASSIC } from '@/features/wizard/mode/bridge/persistenceKeys';

interface DocumentType {
  label: string;
  description?: string;
  steps: Array<{
    key: string;
    title: string;
  }>;
}

interface DocumentTypesRegistry {
  [key: string]: DocumentType;
}

export default function CreateDeedPage() {
  const router = useRouter();
  const [documentTypes, setDocumentTypes] = useState<DocumentTypesRegistry>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch document types from backend per Dynamic Wizard Architecture
    const fetchDocumentTypes = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
        const response = await fetch(`${apiUrl}/api/doc-types`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document types: ${response.status}`);
        }
        
        const data = await response.json();
        setDocumentTypes(data);
      } catch (err) {
        console.error('Error fetching document types:', err);
        // Fallback to hardcoded registry if backend endpoint not available
        console.log('Falling back to hardcoded document types');
        setDocumentTypes({
          grant_deed: {
            label: "Grant Deed",
            description: "Transfer property ownership with warranties against defects during grantor's ownership. Most commonly used in California real estate transactions and sales.",
            steps: [
              { key: "request_details", title: "Request Details" },
              { key: "tax", title: "Transfer Tax" },
              { key: "parties_property", title: "Parties & Property" },
              { key: "review", title: "Review" },
              { key: "generate", title: "Generate" }
            ]
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentTypes();
  }, []);

  const handleDocumentTypeSelect = (docTypeKey: string) => {
    // ✅ PHASE 19 SESSION FIX: Clear all wizard localStorage when starting a NEW deed
    // This ensures a fresh start and prevents resuming old wizard sessions
    console.log('[CreateDeedPage] 🔄 Starting new deed - clearing all wizard localStorage');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WIZARD_DRAFT_KEY_MODERN);
      localStorage.removeItem(WIZARD_DRAFT_KEY_CLASSIC);
      // Mark that we've cleared localStorage for this new deed session
      sessionStorage.setItem('deedWizardCleared', 'true');
    }
    
    // Navigate to specific document wizard per architecture
    router.push(`/create-deed/${docTypeKey.replace('_', '-')}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div className="contact-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gentle-indigo mx-auto mb-4"></div>
              <p className="text-slate-600">Loading document types...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div className="main-content">
          <div className="contact-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="text-center max-w-md mx-auto p-6">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Unable to Load Document Types</h2>
              <p className="text-slate-600 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-gentle-indigo text-white px-4 py-2 rounded-lg hover:bg-gentle-indigo/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div className="main-content">
        <div className="contact-wrapper">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-800 mb-4">
              Create Legal Document
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Select the type of legal document you need to create. Our AI-powered wizard will guide you through the process step by step.
            </p>
          </div>

          {/* Document Type Selection */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {Object.entries(documentTypes).map(([key, docType]) => (
              <div
                key={key}
                onClick={() => handleDocumentTypeSelect(key)}
                className="bg-white rounded-xl shadow-elevated p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border border-slate-200 flex flex-col"
              >
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-gentle-indigo/10 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-gentle-indigo" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800">{docType.label}</h3>
                </div>
                
                {/* Description */}
                {docType.description && (
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed" style={{ minHeight: '60px' }}>
                    {docType.description}
                  </p>
                )}
                
                <div className="mb-4 flex-grow">
                  <p className="text-xs font-medium text-slate-500 mb-2">Process Steps:</p>
                  <div className="flex flex-wrap gap-1">
                    {docType.steps.map((step, index) => (
                      <span
                        key={step.key}
                        className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded"
                      >
                        {index + 1}. {step.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center text-gentle-indigo font-medium mt-auto">
                  <span>Start Wizard</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Fallback for empty registry */}
          {Object.keys(documentTypes).length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No Document Types Available</h3>
              <p className="text-slate-500">Please contact support if this issue persists.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}