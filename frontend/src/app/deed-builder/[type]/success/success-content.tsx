'use client';

import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  CheckCircle, Download, FileText, Share2, Printer, Copy, 
  Plus, ArrowRight, RotateCcw, Eye, Home, Sparkles, Check
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';

const DEED_LABELS: Record<string, string> = {
  'grant-deed': 'Grant Deed',
  'quitclaim-deed': 'Quitclaim Deed',
  'interspousal-transfer': 'Interspousal Transfer Deed',
  'warranty-deed': 'Warranty Deed',
  'tax-deed': 'Tax Deed',
};

interface DeedDetails {
  id: string;
  property_address?: string;
  property?: string;
  pdf_url?: string;
  created_at?: string;
  deed_type?: string;
}

export function SuccessContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const deedId = searchParams.get('id');
  const type = params.type as string;
  
  const [deed, setDeed] = useState<DeedDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  // Fetch deed details
  useEffect(() => {
    const fetchDeed = async () => {
      if (!deedId) {
        setLoading(false);
        return;
      }

      try {
        const api = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
        const response = await fetch(`${api}/deeds/${deedId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setDeed(data);
        }
      } catch (err) {
        console.error('Failed to fetch deed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeed();
  }, [deedId]);

  const handlePreview = () => {
    if (deed?.pdf_url) {
      window.open(deed.pdf_url, '_blank');
    } else {
      toast.error('PDF not available for preview');
    }
  };

  const handleDownload = async () => {
    if (!deedId) return;
    
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      const response = await fetch(`${api}/deeds/${deedId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${DEED_LABELS[type] || 'Deed'}_${deedId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      // Fallback to direct URL if download endpoint fails
      if (deed?.pdf_url) {
        window.open(deed.pdf_url, '_blank');
        toast.success('PDF opened in new tab');
      } else {
        console.error('Download error:', err);
        toast.error('Failed to download PDF');
      }
    }
  };

  const handlePrint = async () => {
    if (deed?.pdf_url) {
      const printWindow = window.open(deed.pdf_url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => printWindow.print(), 500);
        };
      }
    } else {
      toast.error('PDF not available for printing');
    }
  };

  const handleShare = () => {
    router.push(`/past-deeds?id=${deedId}&action=share`);
  };

  const handleCopyId = async () => {
    if (deedId) {
      await navigator.clipboard.writeText(deedId);
      setCopiedId(true);
      toast.success('Document ID copied to clipboard!');
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCreateAnother = () => {
    router.push('/deed-builder');
  };

  const handleSamePropertyDifferentDeed = () => {
    // Navigate to deed type selection with property data preserved
    router.push('/deed-builder');
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const handleViewPastDeeds = () => {
    router.push(`/past-deeds?highlight=${deedId}`);
  };

  const propertyAddress = deed?.property_address || deed?.property || 'Your Property';

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Sidebar />
        <main className="flex-1 p-6 md:p-10 lg:p-16">
          <div className="max-w-[1200px] mx-auto flex flex-col items-center justify-center min-h-[70vh]">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-[#7C4DFF]/20 animate-spin border-t-[#7C4DFF]" />
              <FileText className="w-8 h-8 text-[#7C4DFF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-lg text-slate-600 font-medium">Loading deed details...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Sidebar />
      
      <main className="flex-1 p-6 md:p-10 lg:p-16 overflow-auto">
        <div className="max-w-[1200px] mx-auto">
          
          {/* Success Header */}
          <div className="text-center mb-12">
            {/* Success Animation */}
            <div className="relative inline-block mb-8">
              <div className="w-28 h-28 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg ring-4 ring-green-50 animate-bounce-once">
                <CheckCircle className="w-14 h-14 text-green-500" strokeWidth={2.5} />
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 w-5 h-5 bg-[#7C4DFF] rounded-full animate-ping opacity-75" />
              <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-amber-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '150ms' }} />
              <div className="absolute top-0 -left-4 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '300ms' }} />
              <Sparkles className="absolute -top-4 right-4 w-6 h-6 text-amber-400 animate-pulse" />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight">
              Deed Generated Successfully!
            </h1>
            <p className="text-xl text-slate-600 mb-2">
              {DEED_LABELS[type] || 'Deed'} for
            </p>
            <p className="text-lg text-slate-700 font-semibold max-w-xl mx-auto">
              {propertyAddress}
            </p>
          </div>

          {/* Deed Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-10 max-w-2xl mx-auto">
            {/* Document Info */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-[#7C4DFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-8 h-8 text-[#7C4DFF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-slate-800">{DEED_LABELS[type] || 'Deed'}</p>
                <p className="text-slate-500 truncate">{propertyAddress}</p>
              </div>
            </div>

            {/* Document ID */}
            {deedId && (
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 mb-8">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Document ID</p>
                  <p className="text-sm font-mono text-slate-700">{deedId}</p>
                </div>
                <button
                  onClick={handleCopyId}
                  className="p-3 text-slate-500 hover:text-[#7C4DFF] hover:bg-[#7C4DFF]/10 rounded-lg transition-all duration-200"
                  title="Copy ID"
                >
                  {copiedId ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}

            {/* Primary Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={handlePreview}
                className="flex flex-col items-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-xl hover:border-[#7C4DFF] hover:bg-[#7C4DFF]/5 transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-[#7C4DFF]/10 rounded-full flex items-center justify-center group-hover:bg-[#7C4DFF]/20 transition-colors">
                  <Eye className="w-6 h-6 text-[#7C4DFF]" />
                </div>
                <span className="font-semibold text-slate-700 group-hover:text-[#7C4DFF] transition-colors">Preview</span>
              </button>
              
              <button
                onClick={handleDownload}
                className="flex flex-col items-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-xl hover:border-[#7C4DFF] hover:bg-[#7C4DFF]/5 transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-[#7C4DFF]/10 rounded-full flex items-center justify-center group-hover:bg-[#7C4DFF]/20 transition-colors">
                  <Download className="w-6 h-6 text-[#7C4DFF]" />
                </div>
                <span className="font-semibold text-slate-700 group-hover:text-[#7C4DFF] transition-colors">Download</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex flex-col items-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-xl hover:border-[#7C4DFF] hover:bg-[#7C4DFF]/5 transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-[#7C4DFF]/10 rounded-full flex items-center justify-center group-hover:bg-[#7C4DFF]/20 transition-colors">
                  <Share2 className="w-6 h-6 text-[#7C4DFF]" />
                </div>
                <span className="font-semibold text-slate-700 group-hover:text-[#7C4DFF] transition-colors">Share</span>
              </button>
              
              <button
                onClick={handlePrint}
                className="flex flex-col items-center gap-3 p-5 bg-white border-2 border-slate-200 rounded-xl hover:border-[#7C4DFF] hover:bg-[#7C4DFF]/5 transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-[#7C4DFF]/10 rounded-full flex items-center justify-center group-hover:bg-[#7C4DFF]/20 transition-colors">
                  <Printer className="w-6 h-6 text-[#7C4DFF]" />
                </div>
                <span className="font-semibold text-slate-700 group-hover:text-[#7C4DFF] transition-colors">Print</span>
              </button>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <p className="text-sm text-slate-500 font-semibold uppercase tracking-wider">What would you like to do next?</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={handleCreateAnother}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-[#7C4DFF] hover:bg-[#6a3de8] text-white rounded-xl font-semibold shadow-brand hover:shadow-brand-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Create Another Deed
              </button>
              
              <button
                onClick={handleSamePropertyDifferentDeed}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <RotateCcw className="w-5 h-5" />
                Same Property, Different Deed Type
              </button>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleViewPastDeeds}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 text-[#7C4DFF] hover:bg-[#7C4DFF]/5 rounded-xl font-medium transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  View All Deeds
                </button>
                
                <button
                  onClick={handleBackToDashboard}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                >
                  <Home className="w-5 h-5" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="max-w-2xl mx-auto mt-12">
            <div className="bg-gradient-to-r from-[#7C4DFF]/10 to-[#7C4DFF]/5 rounded-2xl p-6 border border-[#7C4DFF]/20">
              <p className="text-sm text-[#7C4DFF]">
                <span className="font-bold">💡 Pro tip:</span> You can find all your generated deeds in{' '}
                <a href="/past-deeds" className="underline hover:text-[#6a3de8] font-semibold">Past Deeds</a>
                . Share them with title officers, lenders, or attorneys for quick approval.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
