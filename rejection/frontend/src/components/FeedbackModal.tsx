'use client';
import React from 'react';

type Props = {
  title?: string;
  comments: string;
  onClose: () => void;
};

export default function FeedbackModal({ title = 'Reviewer Feedback', comments, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-wrap text-sm text-gray-800">
          {comments?.trim() || '(No comments provided)'}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
