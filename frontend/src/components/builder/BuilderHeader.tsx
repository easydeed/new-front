'use client';

import { ArrowLeft, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GuidanceToggle } from './GuidanceToggle';

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
        {/* U3: the way home says where it goes — "Exit" didn't read as a
            nav affordance inside the chrome-less builder. */}
        <button
          onClick={handleExit}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        
        <div className="h-6 w-px bg-gray-200" />
        
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <h1 className="font-semibold text-gray-900">{deedType}</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <GuidanceToggle />
        {/* The dead "Help" button (no handler) is removed — same fake-
            affordance class as the chat banner this ticket kills. */}
      </div>
    </header>
  );
}
