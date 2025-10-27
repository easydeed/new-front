export type Prompt = {
  id: string;
  title?: string;
  question: string;
  field: string;
  placeholder?: string;
  why?: string;
  type?: 'text' | 'prefill-combo';
  required?: boolean;
  showIf?: (state: any) => boolean;
  label?: string;
};

type Flow = {
  docType: string;
  steps: Prompt[];
};

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
    steps: [...basePartiesGrant],
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
