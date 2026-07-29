'use client';

import { Suspense } from 'react';
import { SuccessContent } from './success-content';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function SuccessPage() {
  // HX0: internal page — no session, no shell.
  const { checked } = useRequireAuth();
  if (!checked) return null;

  return (
    <Suspense fallback={<SuccessPageSkeleton />}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto animate-pulse" />
      </div>
    </div>
  );
}




