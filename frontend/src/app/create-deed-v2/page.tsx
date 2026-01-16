'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WizardHost2 from '@/features/wizard/WizardHost2';
import Sidebar from '@/components/Sidebar';

/**
 * Create Deed v2 - Streamlined 3-Step Wizard
 * 
 * This is the new wizard implementation that combines:
 * - Step 1: Deed Type + Property Search (combined on one screen)
 * - Step 2: Smart Confirm Screen (all fields pre-filled, one page)
 * - Step 3: Success Screen (download, share, print actions)
 * 
 * Key improvements:
 * - ~60 seconds vs 2-3 minutes with the old wizard
 * - 8 clicks vs 15+ clicks
 * - SiteX auto-fills property data, grantor, APN, legal description
 * - Partners auto-fills "Requested By"
 * - AI guides vesting selection
 */
export default function CreateDeedV2Page() {
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      router.push('/login?redirect=/create-deed-v2');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1">
        <WizardHost2 />
      </main>
    </div>
  );
}

