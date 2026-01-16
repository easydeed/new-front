'use client';

import { ArrowLeft, FileText, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BuilderHeaderProps {
  deedType: string;
}

export function BuilderHeader({ deedType }: BuilderHeaderProps) {
  const router = useRouter();

  const handleExit = () => {
    router.push('/dashboard');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={handleExit}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Exit</span>
        </button>
        
        <div className="h-6 w-px bg-gray-200" />
        
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <h1 className="font-semibold text-gray-900">{deedType}</h1>
        </div>
      </div>

      <button className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
        <HelpCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Help</span>
      </button>
    </header>
  );
}

