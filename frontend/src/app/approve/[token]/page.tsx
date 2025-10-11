'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Phase 7: Public deed approval page for external recipients
export default function ApproveSharedDeed() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deedData, setDeedData] = useState<any>(null);
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    fetchSharedDeed();
  }, [token]);

  const fetchSharedDeed = async () => {
    try {
      setLoading(true);
      const api = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';
      
      const response = await fetch(`${api}/approve/${token}`);
      
      if (!response.ok) {
        throw new Error('Failed to load shared deed');
      }

      const data = await response.json();
      setDeedData(data);
    } catch (err: any) {
      console.error('Error loading shared deed:', err);
      setError(err.message || 'Failed to load shared deed');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';
      
      const response = await fetch(`${api}/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: true,
          comments: ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit approval');
      }

      const result = await response.json();
      setResponseSubmitted(true);
      setResponseMessage('✅ Deed approved successfully! The owner has been notified.');
    } catch (err: any) {
      alert('Failed to approve deed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleReject = async () => {
    const comments = prompt('Please provide a reason for rejection (optional):');
    
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'https://deedpro-main-api.onrender.com';
      
      const response = await fetch(`${api}/approve/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved: false,
          comments: comments || ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit rejection');
      }

      const result = await response.json();
      setResponseSubmitted(true);
      setResponseMessage('✅ Your feedback has been submitted. The owner has been notified.');
    } catch (err: any) {
      alert('Failed to reject deed: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-700 font-medium">Loading shared deed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">This link may have expired or been revoked.</p>
        </div>
      </div>
    );
  }

  if (responseSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Response Submitted</h1>
          <p className="text-gray-700 mb-6">{responseMessage}</p>
          <Link 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to DeedPro Home
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = deedData?.expires_at && new Date(deedData.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl">
              🤝
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Shared Deed Review</h1>
              <p className="text-gray-600">From: {deedData?.shared_by || 'DeedPro User'}</p>
            </div>
          </div>

          {deedData?.message && (
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg mb-6">
              <p className="text-gray-700 italic">&quot;{deedData.message}&quot;</p>
            </div>
          )}

          {isExpired && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-lg mb-6">
              <p className="text-red-700 font-medium">⚠️ This approval link has expired</p>
            </div>
          )}
        </div>

        {/* Deed Details */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Deed Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="text-sm text-gray-600 font-medium">Deed Type</p>
              <p className="text-lg text-gray-900 font-semibold">
                {deedData?.deed_type?.replace('_', ' ').toUpperCase() || 'Not specified'}
              </p>
            </div>

            <div className="border-l-4 border-indigo-600 pl-4">
              <p className="text-sm text-gray-600 font-medium">Property Address</p>
              <p className="text-lg text-gray-900 font-semibold">
                {deedData?.property_address || 'Not specified'}
              </p>
            </div>

            <div className="border-l-4 border-purple-600 pl-4">
              <p className="text-sm text-gray-600 font-medium">APN</p>
              <p className="text-lg text-gray-900 font-semibold">
                {deedData?.apn || 'Not specified'}
              </p>
            </div>

            <div className="border-l-4 border-pink-600 pl-4">
              <p className="text-sm text-gray-600 font-medium">Expires</p>
              <p className="text-lg text-gray-900 font-semibold">
                {deedData?.expires_at ? new Date(deedData.expires_at).toLocaleDateString() : 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {deedData?.can_approve && !isExpired && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Response</h2>
            <p className="text-gray-600 mb-6">
              Please review the deed information above and provide your response.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleApprove}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-xl"
              >
                ✅ Approve Deed
              </button>
              
              <button
                onClick={handleReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-xl"
              >
                ❌ Request Changes
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-6">
              Your response will be sent to the deed owner immediately.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-600 mb-2">Powered by DeedPro</p>
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >
            Learn more about DeedPro →
          </Link>
        </div>
      </div>
    </div>
  );
}

