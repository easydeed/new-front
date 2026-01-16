'use client';

import { useRouter } from 'next/navigation';
import { FileText, ArrowRight } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

const DEED_TYPES = [
  {
    id: 'grant-deed',
    title: 'Grant Deed',
    description: 'Standard transfer of property ownership with implied warranties',
    popular: true,
  },
  {
    id: 'quitclaim-deed',
    title: 'Quitclaim Deed',
    description: 'Transfer ownership without warranties — commonly used between family members',
    popular: true,
  },
  {
    id: 'interspousal-transfer',
    title: 'Interspousal Transfer Deed',
    description: 'Transfer between spouses — exempt from documentary transfer tax',
    popular: true,
  },
  {
    id: 'warranty-deed',
    title: 'Warranty Deed',
    description: 'Provides the strongest buyer protections with full title guarantees',
    popular: false,
  },
  {
    id: 'tax-deed',
    title: 'Tax Deed',
    description: 'Transfer resulting from tax sale — typically used by government entities',
    popular: false,
  },
];

export default function DeedBuilderSelectPage() {
  const router = useRouter();

  const handleSelectDeedType = (deedType: string) => {
    router.push(`/deed-builder/${deedType}`);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a Deed</h1>
            <p className="text-gray-600">
              Select the type of deed you want to create. Each deed type serves a different purpose.
            </p>
          </div>

          {/* Deed Types Grid */}
          <div className="grid gap-4">
            {DEED_TYPES.map((deedType) => (
              <button
                key={deedType.id}
                onClick={() => handleSelectDeedType(deedType.id)}
                className="group relative flex items-center gap-4 p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-500 hover:shadow-lg transition-all duration-200 text-left"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                    <FileText className="w-6 h-6 text-brand-500" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{deedType.title}</h3>
                    {deedType.popular && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">{deedType.description}</p>
                </div>

                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-brand-50 border border-brand-200 rounded-xl">
            <p className="text-sm text-brand-800">
              <strong>New!</strong> The Document Builder shows a live preview of your deed as you fill in the details. 
              All information is auto-filled from county records when possible.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

