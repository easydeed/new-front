import { shouldShowLegal } from '@/lib/wizard/legalShowIf';
import type React from 'react';
// Phase 24-H: Import custom wizard components
import DocumentTransferTaxCalculator from '../components/DocumentTransferTaxCalculator';
import ConsolidatedPartiesSection from '../components/ConsolidatedPartiesSection';

export type Prompt = {
  id: string;
  title?: string;
  question: string;
  field: string;
  placeholder?: string;
  why?: string;
  type?: 'text' | 'prefill-combo' | 'component'; // Phase 24-H: Added 'component' type
  component?: React.ComponentType<any>; // Phase 24-H: Custom component
  required?: boolean;
  showIf?: (state: any) => boolean;
  label?: string;
};

type Flow = {
  docType: string;
  steps: Prompt[];
};

// Phase 24-H: Enhanced Grant Deed flow with custom components
const grantDeedSteps: Prompt[] = [
  {
    id: 'requestedBy',
    question: 'Who is requesting the recording?',
    field: 'requestedBy',
    type: 'prefill-combo',
    label: 'Requested By',
    why: 'Select from Industry Partners or type a new one.',
  },
  {
    id: 'dtt',
    title: 'Documentary Transfer Tax',
    question: 'Let us calculate the Documentary Transfer Tax',
    field: 'dtt_fields', // Composite field
    type: 'component',
    component: DocumentTransferTaxCalculator as any,
    why: 'California requires Documentary Transfer Tax on most property transfers. We will auto-calculate this for you.',
  },
  {
    id: 'parties',
    title: 'Parties & Property Details',
    question: 'Who is involved in this transfer?',
    field: 'parties_fields', // Composite field
    type: 'component',
    component: ConsolidatedPartiesSection as any,
    why: 'We need to know who is transferring the property (Grantor) and who is receiving it (Grantee).',
  },
];

// Base parties flow for other deed types (not Grant Deed)
const basePartiesGrant: Prompt[] = [
  {
    id: 'grantor',
    question: 'Who is transferring title (Grantor)?',
    field: 'grantorName',
    type: 'prefill-combo',
    label: 'Grantor',
    why: 'We prefixed this from county owner records where available.',
    required: true,
  },
  {
    id: 'grantee',
    question: 'Who is receiving title (Grantee)?',
    field: 'granteeName',
    type: 'text',
    required: true,
  },
  {
    id: 'legalDescription',
    question: 'What is the legal description of the property?',
    field: 'legalDescription',
    type: 'text',
    placeholder: 'e.g., Lot 1, Block 2, Tract 12345',
    why: 'This describes the exact boundaries of the property being transferred.',
    required: true,
    showIf: (state: any) => shouldShowLegal(state),
  },
  {
    id: 'requestedBy',
    question: 'Who is requesting the recording?',
    field: 'requestedBy',
    type: 'prefill-combo',
    label: 'Requested By',
    why: 'Select from Industry Partners or type a new one.',
  },
  {
    id: 'vesting',
    question: 'How will title be vested?',
    field: 'vesting',
    type: 'text',
    placeholder: 'e.g., Sole and Separate Property',
  },
];

export const promptFlows: Record<string, Flow> = {
  'grant-deed': {
    docType: 'grant-deed',
    steps: [...grantDeedSteps], // Phase 24-H: Using new enhanced flow
  },
  'quitclaim-deed': {
    docType: 'quitclaim-deed',
    steps: [
      ...basePartiesGrant.map(s => ({ ...s, why: s.why || 'Quitclaim conveys without warranties.' })),
    ],
  },
  'interspousal-transfer': {
    docType: 'interspousal-transfer',
    steps: [
      ...basePartiesGrant,
      {
        id: 'dtt-exempt',
        question: 'Reason for Documentary Transfer Tax exemption (if any)?',
        field: 'dttExemptReason',
        type: 'text',
        why: 'Many interspousal transfers are exempt from DTT.',
      },
    ],
  },
  'warranty-deed': {
    docType: 'warranty-deed',
    steps: [
      ...basePartiesGrant,
      {
        id: 'covenants',
        question: 'Any covenant language to include? (optional)',
        field: 'covenants',
        type: 'text',
      },
    ],
  },
  'tax-deed': {
    docType: 'tax-deed',
    steps: [
      ...basePartiesGrant,
      {
        id: 'taxSaleRef',
        question: 'Tax sale reference (book/page or sale ID)?',
        field: 'taxSaleRef',
        type: 'text',
      },
    ],
  },
};
