'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  FileText,
  MapPin,
  Calendar,
  Hash,
  Users,
  Loader2
} from 'lucide-react';

interface VerificationResult {
  valid: boolean;
  status: 'valid' | 'revoked' | 'not_found';
  message: string;
  document?: {
    id: string;
    type: string;
    propertyAddress: string;
    apn: string;
    county: string;
    grantor: string;
    grantee: string;
    generatedAt: string;
    contentHash: string;
    verificationCount: number;
  };
}

export default function VerifyPage() {
  const params = useParams();
  const code = params.code as string;
  
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-backend.onrender.com';
        const response = await fetch(
          `${apiUrl}/api/verify/${code}?method=qr_scan`
        );
        const data = await response.json();
        setResult(data);
      } catch (err) {
        console.error('Verification error:', err);
        setError('Unable to verify document. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    if (code) {
      verify();
    }
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-[#7C4DFF]/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-[#7C4DFF] animate-spin" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-4 border-[#7C4DFF]/20 border-t-[#7C4DFF] animate-spin" style={{ animationDuration: '1.5s' }} />
          </div>
          <p className="text-slate-600 font-medium">Verifying document...</p>
          <p className="text-slate-400 text-sm mt-1">{code}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Verification Error</h1>
          <p className="text-slate-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-[#7C4DFF] text-white rounded-lg hover:bg-[#6A3DE8] transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#7C4DFF] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#7C4DFF]/25">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Document Verification</h1>
          <p className="text-slate-500 mt-1">DeedPro Authenticity Check</p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Status Banner */}
          <div className={`p-6 ${
            result?.status === 'valid' 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
              : result?.status === 'revoked'
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : 'bg-gradient-to-r from-amber-500 to-amber-600'
          }`}>
            <div className="flex items-center justify-center gap-3 text-white">
              {result?.status === 'valid' ? (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
              ) : result?.status === 'revoked' ? (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <XCircle className="w-7 h-7" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7" />
                </div>
              )}
              <div>
                <span className="text-2xl font-bold block">
                  {result?.status === 'valid' 
                    ? 'Verified' 
                    : result?.status === 'revoked'
                    ? 'Revoked'
                    : 'Not Found'}
                </span>
                <p className="text-white/90 text-sm">
                  {result?.message}
                </p>
              </div>
            </div>
          </div>

          {/* Document Details */}
          {result?.document && result.status === 'valid' && (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                <div className="w-11 h-11 bg-[#7C4DFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-[#7C4DFF]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Document Type</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{result.document.type}</p>
                </div>
              </div>

              {result.document.propertyAddress && (
                <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                  <div className="w-11 h-11 bg-[#7C4DFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-[#7C4DFF]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Property</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{result.document.propertyAddress}</p>
                    {(result.document.apn || result.document.county) && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {result.document.apn && `APN: ${result.document.apn}`}
                        {result.document.apn && result.document.county && ' • '}
                        {result.document.county && `${result.document.county} County`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(result.document.grantor || result.document.grantee) && (
                <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                  <div className="w-11 h-11 bg-[#7C4DFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-[#7C4DFF]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Parties</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {result.document.grantor} → {result.document.grantee}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
                <div className="w-11 h-11 bg-[#7C4DFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#7C4DFF]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Generated</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {new Date(result.document.generatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-[#7C4DFF]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Hash className="w-5 h-5 text-[#7C4DFF]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Document ID</p>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5">{result.document.id}</p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Hash: {result.document.contentHash}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 text-center">
              {result?.document?.verificationCount && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium mr-2">
                  <CheckCircle className="w-3 h-3" />
                  Verified {result.document.verificationCount} time{result.document.verificationCount !== 1 ? 's' : ''}
                </span>
              )}
              Powered by{' '}
              <a href="https://deedpro.com" className="text-[#7C4DFF] hover:underline font-medium">
                DeedPro
              </a>
            </p>
          </div>
        </div>

        {/* Manual Entry */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 mb-3">Have a different document ID?</p>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem('code') as HTMLInputElement;
              if (input.value) {
                window.location.href = `/verify/${input.value}`;
              }
            }}
            className="flex gap-2 max-w-xs mx-auto"
          >
            <input
              type="text"
              name="code"
              placeholder="DOC-2026-XXXXX"
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans bg-white"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#7C4DFF] text-white rounded-lg hover:bg-[#6A3DE8] transition-colors text-sm font-medium shadow-lg shadow-[#7C4DFF]/25"
            >
              Verify
            </button>
          </form>
        </div>

        {/* Security Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400">
            🔒 This verification confirms the document was generated by DeedPro.<br />
            It does not validate the legal status of the deed or property transfer.
          </p>
        </div>
      </div>
    </div>
  );
}
