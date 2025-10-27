
export type Prompt = {
  id: string;
  title?: string;
  question: string;
  field: string;
  placeholder?: string;
  why?: string;
  required?: boolean;
  showIf?: (state: any) => boolean;
  type?: 'text' | 'select' | 'owner' | 'partner';
  options?: Array<{ label: string; value: string }>;
};

type Flow = { docType: string; steps: Prompt[]; };

const basePartiesGrant: Prompt[] = [
  {
    id: 'grantor',
    title: 'Parties',
    question: "Who is transferring title (Grantor)?",
    field: 'grantorName',
    why: 'We’ll prefill from county owner data when available. You can also type a new name.',
    type: 'owner',
    required: true
  },
  {
    id: 'grantee',
    question: "Who is receiving title (Grantee)?",
    field: 'granteeName',
    why: 'Enter the new owner as it should appear on the deed.',
    required: true
  }
];

const vestingPrompt: Prompt = {
  id: 'vesting',
  title: 'Vesting',
  question: 'How should the new owner hold title (vesting)?',
  field: 'vesting',
  type: 'select',
  options: [
    { label: 'Sole and Separate Property', value: 'Sole and Separate Property' },
    { label: 'Joint Tenancy', value: 'Joint Tenancy' },
    { label: 'Community Property with Right of Survivorship', value: 'Community Property with Right of Survivorship' },
    { label: 'Tenants in Common', value: 'Tenants in Common' }
  ]
};

const requestDetails: Prompt[] = [
  {
    id: 'requested-by',
    title: 'Requested By',
    question: 'Who is requesting recording?',
    field: 'requestedBy',
    type: 'partner',
    why: 'Pick from your Industry Partners or add a new one.',
  }
];

export const promptFlows: Record<string, Flow> = {
  'grant-deed': {
    docType: 'grant-deed',
    steps: [
      ...basePartiesGrant,
      vestingPrompt,
      ...requestDetails
    ]
  },
  'quitclaim-deed': {
    docType: 'quitclaim-deed',
    steps: [
      ...basePartiesGrant,
      { id: 'note', question: 'Any special notes to include?', field: 'covenants' },
      ...requestDetails
    ]
  },
  'interspousal-transfer': {
    docType: 'interspousal-transfer',
    steps: [
      ...basePartiesGrant,
      { id: 'dtt-exempt', question: 'Reason for Transfer Tax exemption (if any)?', field: 'dttExemptReason', why: 'Many interspousal transfers are exempt from DTT.' },
      ...requestDetails
    ]
  },
  'warranty-deed': {
    docType: 'warranty-deed',
    steps: [
      ...basePartiesGrant,
      { id: 'covenants', question: 'Include standard warranty covenants?', field: 'covenants' },
      ...requestDetails
    ]
  },
  'tax-deed': {
    docType: 'tax-deed',
    steps: [
      ...basePartiesGrant,
      { id: 'tax-sale-ref', question: 'Reference your tax sale/case number', field: 'taxSaleRef', required: true },
      ...requestDetails
    ]
  }
};
