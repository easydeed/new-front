'use client';

import React, { useState, useEffect } from 'react';

interface DeedPreviewPanelProps {
  previewHtml: string;
  isLoading: boolean;
  onRegeneratePreview: () => void;
  onEditMode: () => void;
  onGenerateFinalDeed: () => void;
  isGenerating: boolean;
  deedType: string;
  validation: {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

export default function DeedPreviewPanel({
  previewHtml,
  isLoading,
  onRegeneratePreview,
  onEditMode,
  onGenerateFinalDeed,
  isGenerating,
  deedType,
  validation
}: DeedPreviewPanelProps) {
  const [previewScale, setPreviewScale] = useState(1);
  const [showValidation, setShowValidation] = useState(false);

  // Auto-scroll to preview when it loads
  useEffect(() => {
    if (previewHtml && !isLoading) {
      setTimeout(() => {
        const previewElement = document.getElementById('deed-preview-content');
        if (previewElement) {
          previewElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [previewHtml, isLoading]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${deedType} - Preview Print</title>
          <style>
            body { margin: 0; padding: 20px; font-family: 'Times New Roman', serif; }
            @media print { body { margin: 0; padding: 0; } }
          </style>
        </head>
        <body>
          ${previewHtml}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-tertiary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-2">
            Generating Preview...
          </h3>
          <p className="text-gray-600 text-center max-w-md">
            Our AI is crafting your perfect deed with all the details you've provided.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></div>
            <span>Processing your data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!previewHtml) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-6">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Ready to Preview Your Deed
          </h3>
          <p className="text-gray-600 text-center max-w-md mb-6">
            Complete the form above and click "Preview Deed" to see how your document will look.
          </p>
          <button
            onClick={onRegeneratePreview}
            className="bg-tertiary text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Generate Preview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              📄 {deedType} Preview
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Zoom Out"
              >
                🔍-
              </button>
              <span className="text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round(previewScale * 100)}%
              </span>
              <button
                onClick={() => setPreviewScale(Math.min(2, previewScale + 0.1))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Zoom In"
              >
                🔍+
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!validation.isValid && (
              <button
                onClick={() => setShowValidation(!showValidation)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors flex items-center gap-2"
              >
                ⚠️ {validation.missingFields.length} Issues
              </button>
            )}
            
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              🖨️ Print
            </button>
            
            <button
              onClick={onEditMode}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
            >
              ✏️ Edit
            </button>
            
            <button
              onClick={onRegeneratePreview}
              className="px-4 py-2 bg-tertiary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Validation Issues Panel */}
        {showValidation && !validation.isValid && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">
              Missing Required Information:
            </h4>
            <ul className="space-y-1 text-red-700 text-sm">
              {validation.missingFields.map((field, index) => (
                <li key={index} className="flex items-center">
                  <span className="text-red-500 mr-2">•</span>
                  {field}
                </li>
              ))}
            </ul>
            <button
              onClick={onEditMode}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Fix Issues
            </button>
          </div>
        )}
      </div>

      {/* Preview Content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div 
          id="deed-preview-content"
          className="preview-container"
          style={{
            transform: `scale(${previewScale})`,
            transformOrigin: 'top center',
            minHeight: '600px'
          }}
        >
          <div 
            className="deed-preview-content p-6"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="text-center sm:text-left">
            <h4 className="font-semibold text-gray-900 mb-1">
              Ready to Generate Your Final Deed?
            </h4>
            <p className="text-sm text-gray-600">
              This will create a PDF and count toward your plan usage.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onEditMode}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              ← Back to Edit
            </button>
            
            <button
              onClick={onGenerateFinalDeed}
              disabled={isGenerating || !validation.isValid}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isGenerating || !validation.isValid
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating PDF...
                </>
              ) : (
                <>
                  📄 Generate Final Deed
                </>
              )}
            </button>
          </div>
        </div>

        {validation.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-semibold text-yellow-800 text-sm mb-1">
              Optional Recommendations:
            </h5>
            <ul className="text-yellow-700 text-xs space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style jsx>{`
        .deed-preview-content {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          color: #000;
          background: white;
        }
        
        .preview-container {
          transition: transform 0.2s ease;
          margin: 0 auto;
          max-width: 8.5in;
        }
        
        @media print {
          .preview-container {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
