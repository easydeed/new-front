'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download,
  Eye,
  EyeOff,
  MessageSquare,
  User,
  MapPin,
  Building,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface DeedDetails {
  deed_type: string;
  property_address: string;
  apn: string;
  county: string;
  grantors: string;
  grantees: string;
  owner_name: string;
  expires_at: string;
  status: string;
  can_approve: boolean;
  pdf_url?: string;
}

// Common issues for structured feedback
const COMMON_ISSUES = [
  { id: 'grantor_name', label: 'Grantor name incorrect' },
  { id: 'grantee_name', label: 'Grantee name incorrect' },
  { id: 'legal_description', label: 'Legal description issue' },
  { id: 'vesting', label: 'Vesting incorrect' },
  { id: 'property_address', label: 'Property address incorrect' },
  { id: 'apn', label: 'APN incorrect' },
  { id: 'dtt', label: 'Transfer tax issue' },
  { id: 'other', label: 'Other issue' },
];

export default function ApproveDeedPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [deed, setDeed] = useState<DeedDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAction, setSubmittedAction] = useState<'approved' | 'rejected' | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);

  useEffect(() => {
    fetchDeedDetails();
  }, [token]);

  const fetchDeedDetails = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      const response = await fetch(`${api}/approve/${token}`);
      
      if (!response.ok) {
        if (response.status === 410) {
          setError('This approval link has expired. Please request a new link from the sender.');
        } else if (response.status === 404) {
          setError('This approval link is invalid or has been revoked.');
        } else {
          setError('Unable to load deed details. Please try again later.');
        }
        return;
      }
      
      const data = await response.json();
      setDeed(data);
    } catch (err) {
      console.error('Error loading deed:', err);
      setError('Unable to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      const response = await fetch(`${api}/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });
      
      if (response.ok) {
        setSubmitted(true);
        setSubmittedAction('approved');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to submit approval.');
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectComments.trim() && selectedIssues.length === 0) {
      return;
    }
    
    setSubmitting(true);
    try {
      // Build structured feedback
      const feedback = {
        issues: selectedIssues,
        comments: rejectComments,
        timestamp: new Date().toISOString(),
      };
      
      const api = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
      const response = await fetch(`${api}/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approved: false, 
          comments: JSON.stringify(feedback),
        }),
      });
      
      if (response.ok) {
        setSubmitted(true);
        setSubmittedAction('rejected');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to submit feedback.');
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeRemaining = () => {
    if (!deed?.expires_at) return '';
    const expires = new Date(deed.expires_at);
    const now = new Date();
    const hours = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
    return 'Expiring soon';
  };

  const getPdfUrl = () => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'https://deedpro-main-api.onrender.com';
    return `${api}/approve/${token}/pdf`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#7C4DFF] animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading deed details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Unable to Load</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-[#7C4DFF] text-white font-medium rounded-lg hover:bg-[#6a3de8] transition-colors"
          >
            Go to DeedPro Home
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <div className={`w-16 h-16 ${submittedAction === 'approved' ? 'bg-green-100' : 'bg-amber-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {submittedAction === 'approved' ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <MessageSquare className="w-8 h-8 text-amber-500" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">
            {submittedAction === 'approved' ? 'Deed Approved' : 'Feedback Submitted'}
          </h1>
          <p className="text-slate-600 mb-6">
            {submittedAction === 'approved' 
              ? 'Thank you for your approval. The sender has been notified and the deed is ready for recording.'
              : 'Your feedback has been sent to the sender. They will revise the deed and may share an updated version with you.'
            }
          </p>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-[#7C4DFF] text-white font-medium rounded-lg hover:bg-[#6a3de8] transition-colors"
          >
            Go to DeedPro Home
          </Link>
        </div>
      </div>
    );
  }

  // Main approval view
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7C4DFF] rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800">Deed Review</h1>
              <p className="text-sm text-slate-500">From {deed?.owner_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
            <Clock className="w-4 h-4" />
            <span className="font-medium">{getTimeRemaining()}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Deed Details & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Deed Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#7C4DFF]" />
                Deed Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Deed Type</div>
                  <div className="font-medium text-slate-800">{deed?.deed_type}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Property Address
                  </div>
                  <div className="font-medium text-slate-800">{deed?.property_address}</div>
                  {deed?.apn && <div className="text-sm text-slate-500 mt-1">APN: {deed.apn}</div>}
                </div>
                
                {deed?.county && (
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <Building className="w-3 h-3" /> County
                    </div>
                    <div className="font-medium text-slate-800">{deed.county}</div>
                  </div>
                )}
                
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Grantor (Seller)
                  </div>
                  <div className="font-medium text-slate-800">{deed?.grantors || 'Not specified'}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Grantee (Buyer)
                  </div>
                  <div className="font-medium text-slate-800">{deed?.grantees || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            {deed?.can_approve && !showRejectForm && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="font-bold text-slate-800 mb-4">Your Decision</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    Approve Deed
                  </button>
                  
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-medium transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Request Changes
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 text-center mt-4">
                  Your response will be sent to the deed owner immediately.
                </p>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="font-bold text-slate-800 mb-4">Request Changes</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      What needs to be corrected?
                    </label>
                    <div className="space-y-2">
                      {COMMON_ISSUES.map((issue) => (
                        <label key={issue.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedIssues.includes(issue.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIssues([...selectedIssues, issue.id]);
                              } else {
                                setSelectedIssues(selectedIssues.filter(i => i !== issue.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[#7C4DFF] focus:ring-[#7C4DFF]"
                          />
                          <span className="text-sm text-slate-700">{issue.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Additional comments
                    </label>
                    <textarea
                      value={rejectComments}
                      onChange={(e) => setRejectComments(e.target.value)}
                      placeholder="Please describe what needs to be changed..."
                      rows={4}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#7C4DFF] focus:border-[#7C4DFF] resize-none transition-colors"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setSelectedIssues([]);
                        setRejectComments('');
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={submitting || (selectedIssues.length === 0 && !rejectComments.trim())}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      Submit Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Already responded */}
            {!deed?.can_approve && (
              <div className="bg-slate-100 rounded-xl p-6 text-center">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">
                  {deed?.status === 'approved' && 'This deed has already been approved.'}
                  {deed?.status === 'rejected' && 'Changes have already been requested for this deed.'}
                  {deed?.status === 'expired' && 'This approval link has expired.'}
                  {deed?.status === 'revoked' && 'Access to this deed has been revoked.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - PDF Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="font-bold text-slate-800">Document Preview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPdfPreview(!showPdfPreview)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {showPdfPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPdfPreview ? 'Hide' : 'Show'} Preview
                  </button>
                  <a
                    href={getPdfUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#7C4DFF] hover:text-[#6a3de8] border border-[#7C4DFF] rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </div>
              </div>
              
              <div className="h-[700px] bg-slate-100">
                {showPdfPreview ? (
                  <iframe
                    src={getPdfUrl()}
                    className="w-full h-full border-0"
                    title="Deed PDF Preview"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="font-medium">Click "Show Preview" to view the deed</p>
                      <p className="text-sm mt-1">or download the PDF to review offline</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center">
          <p className="text-slate-500 text-sm">
            Powered by <Link href="/" className="text-[#7C4DFF] hover:underline font-medium">DeedPro</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
