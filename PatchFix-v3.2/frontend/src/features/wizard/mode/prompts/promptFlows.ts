
export type Prompt = {
  id: string;
  question: string;
  field: string;
  why?: string;
  required?: boolean;
  type?: 'text' | 'select';
  optionsFrom?: 'owners' | 'partners' | 'none';
  placeholder?: string;
  showIf?: (state: any) => boolean;
};

export function slug(docType: string) {
  return (docType || '').toLowerCase().replace(/_/g,'-');
}

// Reusable base blocks AFTER property verification
const basePartiesGrant: Prompt[] = [
  {
    id: 'grantor',
    question: 'Who is transferring title (Grantor)?',
    field: 'grantorName',
    why: 'Selecting from detected owners reduces errors.',
    type: 'select',
    optionsFrom: 'owners',
    required: true
  },
  {
    id: 'grantee',
    question: 'Who is receiving title (Grantee)?',
    field: 'granteeName',
    type: 'text',
    placeholder: 'Name of the Grantee...',
    required: true
  },
  {
    id: 'vesting',
    question: 'How should title be vested?',
    field: 'vesting',
    type: 'text',
    placeholder: 'e.g., Sole and Separate Property'
  },
  {
    id: 'requestedBy',
    question: 'Requested by (Industry Partner or type a new one)',
    field: 'requestedBy',
    type: 'select',
    optionsFrom: 'partners',
    why: 'Partners are scoped to your organization. Selecting here auto-fills the recorders’ “Requested by” line.'
  }
];

export const promptFlows: Record<string, { docType: string; steps: Prompt[] }> = {
  'grant-deed': {
    docType: 'grant-deed',
    steps: [
      ...basePartiesGrant
    ]
  },
  'quitclaim-deed': {
    docType: 'quitclaim-deed',
    steps: [
      {
        id: 'releasor',
        question: 'Who is releasing their interest (Quitclaim Grantor)?',
        field: 'grantorName',
        type: 'select',
        optionsFrom: 'owners',
        required: true
      },
      {
        id: 'recipient',
        question: 'Who is receiving (Grantee)?',
        field: 'granteeName',
        type: 'text',
        required: true
      },
      {
        id: 'requestedBy',
        question: 'Requested by',
        field: 'requestedBy',
        type: 'select',
        optionsFrom: 'partners'
      }
    ]
  },
  'interspousal-transfer': {
    docType: 'interspousal-transfer',
    steps: [
      ...basePartiesGrant,
      {
        id: 'dtt',
        question: 'Reason for Documentary Transfer Tax exemption (if any)?',
        field: 'dttExemptReason',
        type: 'text',
        placeholder: 'e.g., Interspousal transfer exemption'
      }
    ]
  },
  'warranty-deed': {
    docType: 'warranty-deed',
    steps: [
      ...basePartiesGrant,
      { id: 'covenants', question: 'Any special covenants or restrictions?', field: 'covenants', type: 'text'}
    ]
  },
  'tax-deed': {
    docType: 'tax-deed',
    steps: [
      ...basePartiesGrant,
      { id: 'taxsale', question: 'Tax sale reference number (if known)?', field: 'taxSaleRef', type: 'text'}
    ]
  }
};
