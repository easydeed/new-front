'use client';

import { useState } from 'react';
import { 
  CheckCircle, Download, Share2, Printer, Eye,
  Plus, ArrowRight, RotateCcw, Copy, Check, Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface SuccessScreenProps {
  deedType: string;
  propertyAddress: string;
  pdfUrl: string;
  deedId: number;
  onCreateAnother: () => void;
  onSamePropertyDifferentDeed: () => void;
  onGoToDashboard: () => void;
}

// Deed type display names
const DEED_TYPE_LABELS: Record<string, string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer Deed',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed',
};

export function SuccessScreen({
  deedType,
  propertyAddress,
  pdfUrl,
  deedId,
  onCreateAnother,
  onSamePropertyDifferentDeed,
  onGoToDashboard,
}: SuccessScreenProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const handleDownload = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
      toast.success('PDF downloading...');
    } else {
      toast.error('PDF not available');
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
      }
    } else {
      toast.error('PDF not available for printing');
    }
  };

  const handlePreview = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      toast.error('PDF not available');
    }
  };

  const handleCopyLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/past-deeds?id=${deedId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleShareViaEmail = () => {
    // Navigate to past deeds with share modal open
    window.location.href = `/past-deeds?id=${deedId}&action=share`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Success Animation */}
      <div className="mb-8">
        <div className="relative">
          {/* Success checkmark with animation */}
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-once relative">
            <CheckCircle className="w-12 h-12 text-green-500" />
            {/* Confetti-like decorations */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-brand-400 rounded-full animate-ping opacity-75" />
            <div className="absolute -bottom-1 -left-3 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-75 animation-delay-150" />
            <div className="absolute top-0 -left-4 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75 animation-delay-300" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Deed Generated Successfully!
        </h1>
        <p className="text-gray-500 text-lg">
          {DEED_TYPE_LABELS[deedType] || 'Deed'} for
        </p>
        <p className="text-gray-700 font-medium">
          {propertyAddress}
        </p>
      </div>

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <button
          onClick={handlePreview}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center group-hover:bg-brand-200 transition-colors">
            <Eye className="w-6 h-6 text-brand-600" />
          </div>
          <span className="font-medium text-gray-700 group-hover:text-brand-600 transition-colors">Preview</span>
        </button>
        
        <button
          onClick={handleDownload}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center group-hover:bg-brand-200 transition-colors">
            <Download className="w-6 h-6 text-brand-600" />
          </div>
          <span className="font-medium text-gray-700 group-hover:text-brand-600 transition-colors">Download</span>
        </button>
        
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center group-hover:bg-brand-200 transition-colors">
            <Share2 className="w-6 h-6 text-brand-600" />
          </div>
          <span className="font-medium text-gray-700 group-hover:text-brand-600 transition-colors">Share</span>
        </button>
        
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all duration-200 group"
        >
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center group-hover:bg-brand-200 transition-colors">
            <Printer className="w-6 h-6 text-brand-600" />
          </div>
          <span className="font-medium text-gray-700 group-hover:text-brand-600 transition-colors">Print</span>
        </button>
      </div>

      {/* Share Options Dropdown */}
      {showShareOptions && (
        <div className="mb-10 p-6 bg-gray-50 rounded-xl animate-in fade-in slide-in-from-top-2">
          <h3 className="font-semibold text-gray-900 mb-4">Share Options</h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copiedLink ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-700">Copy Link</span>
                </>
              )}
            </button>
            <button
              onClick={handleShareViaEmail}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span className="font-medium">Send for Approval</span>
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200 my-8" />

      {/* What's Next */}
      <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-6 font-medium">What would you like to do next?</p>
        
        <button
          onClick={onCreateAnother}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 shadow-brand hover:shadow-brand-lg transition-all duration-200 transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Create Another Deed
        </button>
        
        <button
          onClick={onSamePropertyDifferentDeed}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        >
          <RotateCcw className="w-5 h-5" />
          Same Property, Different Deed Type
        </button>
        
        <button
          onClick={onGoToDashboard}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          Back to Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer tip */}
      <div className="mt-12 p-4 bg-brand-50 rounded-xl">
        <p className="text-sm text-brand-700">
          <span className="font-semibold">💡 Pro tip:</span> You can find all your generated deeds in{' '}
          <a href="/past-deeds" className="underline hover:text-brand-800">Past Deeds</a>
        </p>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
        .animation-delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
}

