'use client';

import React, { useState } from 'react';

interface PreviewDataDebuggerProps {
  formData: any;
  aiSuggestions: any;
  templateData: any;
  validation: {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

export default function PreviewDataDebugger({ 
  formData, 
  aiSuggestions, 
  templateData,
  validation 
}: PreviewDataDebuggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('validation');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-tertiary text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-lg hover:bg-blue-600 transition-colors z-50"
        style={{ fontSize: '12px' }}
      >
        🔍 Debug Preview Data
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            🔍 Preview Data Debugger
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'validation', label: '✅ Validation', icon: '🔍' },
            { id: 'mapping', label: '🔗 Field Mapping', icon: '↔️' },
            { id: 'template', label: '📄 Template Data', icon: '📋' },
            { id: 'raw', label: '🗂️ Raw Form Data', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-tertiary text-tertiary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          
          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg border-2 ${
                validation.isValid 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <h4 className={`font-bold text-lg mb-2 ${
                  validation.isValid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {validation.isValid ? '✅ Validation Passed' : '❌ Validation Failed'}
                </h4>
                <p className={validation.isValid ? 'text-green-700' : 'text-red-700'}>
                  {validation.isValid 
                    ? 'All required fields are complete. Preview generation should succeed.'
                    : `${validation.missingFields.length} required fields are missing.`
                  }
                </p>
              </div>

              {validation.missingFields.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-semibold text-red-800 mb-2">Missing Required Fields:</h5>
                  <ul className="space-y-1 text-red-700">
                    {validation.missingFields.map((field, index) => (
                      <li key={index} className="flex items-center">
                        <span className="text-red-500 mr-2">•</span>
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-800 mb-2">Warnings:</h5>
                  <ul className="space-y-1 text-yellow-700">
                    {validation.warnings.map((warning, index) => (
                      <li key={index} className="flex items-center">
                        <span className="text-yellow-500 mr-2">⚠️</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Field Mapping Tab */}
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-gray-900 mb-4">
                📋 Wizard → Template Field Mapping
              </h4>
              {Object.entries(templateData || {}).map(([templateField, value]) => {
                const wizardField = getWizardFieldForTemplate(templateField);
                const hasAIValue = aiSuggestions && aiSuggestions[wizardField];
                
                return (
                  <div key={templateField} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-800">
                        <code className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {templateField}
                        </code>
                      </div>
                      {hasAIValue && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                          ✨ AI Enhanced
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      <strong>Source:</strong> <code>{wizardField}</code>
                    </div>
                    <div className="text-sm">
                      <strong>Value:</strong> 
                      <span className={`ml-2 ${
                        value && value !== '_____________________' 
                          ? 'text-green-700 font-medium' 
                          : 'text-red-500'
                      }`}>
                        {value || '(empty)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Template Data Tab */}
          {activeTab === 'template' && (
            <div>
              <h4 className="font-bold text-lg text-gray-900 mb-4">
                📄 Final Template Data (JSON)
              </h4>
              <pre className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-xs overflow-auto">
                {JSON.stringify(templateData, null, 2)}
              </pre>
            </div>
          )}

          {/* Raw Form Data Tab */}
          {activeTab === 'raw' && (
            <div>
              <h4 className="font-bold text-lg text-gray-900 mb-4">
                🗂️ Raw Wizard Form Data
              </h4>
              <pre className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-xs overflow-auto">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify({
              validation,
              templateData,
              formData
            }, null, 2))}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors"
          >
            📋 Copy Debug Data
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-tertiary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper function to map template fields back to wizard fields
function getWizardFieldForTemplate(templateField: string): string {
  const mapping: Record<string, string> = {
    'recording_requested_by': 'recordingRequestedBy',
    'mail_to': 'mailTo',
    'order_no': 'orderNo', 
    'escrow_no': 'escrowNo',
    'apn': 'apn',
    'documentary_tax': 'documentaryTax',
    'city': 'city',
    'grantor': 'grantorName',
    'grantee': 'granteeName',
    'county': 'county',
    'property_description': 'legalDescription',
    'date': 'deedDate',
    'grantor_signature': 'grantorSignature',
    'county_notary': 'notaryCounty',
    'notary_date': 'notaryDate',
    'notary_name': 'notaryName',
    'appeared_before_notary': 'appearedBeforeNotary',
    'notary_signature': 'notaryName',
    'tax_computed_full_value': 'taxComputedFullValue',
    'tax_computed_less_liens': 'taxComputedLessLiens',
    'is_unincorporated': 'isUnincorporated',
    'vesting_description': 'vesting'
  };
  
  return mapping[templateField] || templateField;
}
