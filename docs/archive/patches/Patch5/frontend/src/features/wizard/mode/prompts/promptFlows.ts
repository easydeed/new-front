'use client';
/**
 * Declarative prompts per deed type.
 * Adds optionsProvider for dynamic prefill from verifiedData (owners) and partners.
 */
import { ComboOption } from '@/features/wizard/mode/components/Combobox';

export type Prompt = {
  id: string;
  label?: string;
  question: string;
  field: string;
  type?: 'text'|'combobox';
  placeholder?: string;
  why?: string;
  required?: boolean;
  optionsProvider?: (ctx: any) => ComboOption[];
};

export type Flow = {
  docType: string;
  steps: Prompt[];
};

const basePartiesGrant: Prompt[] = [
  {
    id: 'grantor-name',
    question: 'Who is transferring (Grantor)?',
    field: 'grantorName',
    type: 'combobox',
    optionsProvider: (ctx) => {
      const owners: string[] = (ctx.ownerCandidates || []) as string[];
      return owners.map(n => ({ value: n, label: n }));
    },
    required: true
  },
  {
    id: 'grantee-name',
    question: 'Who is receiving (Grantee)?',
    field: 'granteeName',
    type: 'text',
    required: true
  },
  {
    id: 'requested-by',
    question: 'Who is the document requested by?',
    field: 'requestedByName',
    type: 'combobox',
    optionsProvider: (ctx) => {
      const partners = ctx.partners || [];
      return partners.map((p:any) => ({ value: p.id, label: `${p.company_name} — ${p.contact_name || p.role || ''}` }));
    }
  },
  {
    id: 'vesting',
    question: 'How will title vesting be held?',
    field: 'vesting',
    type: 'text',
    placeholder: 'e.g., Sole and Separate Property'
  }
];

const grantDeedFlow: Flow = {
  docType: 'grant-deed',
  steps: [...basePartiesGrant]
};

const quitclaimFlow: Flow = {
  docType: 'quitclaim-deed',
  steps: [...basePartiesGrant]
};

const interspousalFlow: Flow = {
  docType: 'interspousal-transfer',
  steps: [
    ...basePartiesGrant,
    {
      id: 'dtt-exempt',
      question: 'Reason for Documentary Transfer Tax exemption (if any)?',
      field: 'dttExemptReason',
      type: 'text',
      why: 'Many interspousal transfers are exempt from DTT.'
    }
  ]
};

export const promptFlows: Record<string, Flow> = {
  'grant-deed': grantDeedFlow,
  'quitclaim-deed': quitclaimFlow,
  'interspousal-transfer': interspousalFlow,
};

export function toCanonicalFor(docType: string, state: any) {
  // Minimal canonical payload mapper for Modern mode
  return {
    deedType: docType,
    property: {
      address: state?.propertyAddress || state?.property?.address || state?.verifiedData?.fullAddress || '',
      apn: state?.apn || state?.property?.apn || '',
      county: state?.county || state?.property?.county || '',
    },
    parties: {
      grantor: { name: state?.grantorName || state?.parties?.grantor?.name || '' },
      grantee: { name: state?.granteeName || state?.parties?.grantee?.name || '' },
    },
    vesting: { description: state?.vesting || '' },
    requestDetails: {
      requestedByName: state?.requestedByName || state?.requestDetails?.requestedByName || ''
    }
  };
}
