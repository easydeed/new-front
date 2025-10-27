import { validators } from '../validation/validators';

export type Prompt = {
  id: string;
  title: string;
  question: string;
  field: string;           // maps to store field
  placeholder?: string;
  why?: string;
  required?: boolean;
  validate?: (value: any, state: any) => string | null;
  showIf?: (state: any) => boolean;
};

export type PromptFlow = { docType: string; steps: Prompt[] };

/**
 * v4 — property is handled by your existing Step 1.
 * These flows START after property verification.
 */
export const promptFlows: Record<string, PromptFlow> = {
  'grant-deed': {
    docType: 'grant-deed',
    steps: [
      { id: 'grantor', title: 'Parties', question: 'Who is granting title (current owner)?', field: 'grantorName', placeholder: 'John A. Smith', required: true, validate: validators.name('Grantor') },
      { id: 'grantee', title: 'Parties', question: 'Who will receive title?', field: 'granteeName', placeholder: 'The Smith Family Trust (dated 03/14/2020)', required: true, validate: validators.name('Grantee') },
      { id: 'vesting', title: 'Vesting', question: 'What is the vesting for the receiving party?', field: 'vesting', placeholder: 'Sole and Separate Property' },
    ]
  },
  'quitclaim-deed': {
    docType: 'quitclaim-deed',
    steps: [
      { id: 'releasor', title: 'Parties', question: 'Who is releasing interest in the property (Quitclaim)?', field: 'grantorName', placeholder: 'Jane Q. Public', required: true, validate: validators.name('Releasor') },
      { id: 'retaining', title: 'Parties', question: 'Who will retain ownership?', field: 'granteeName', placeholder: 'John Q. Public', required: true, validate: validators.name('Retaining owner') },
      { id: 'vesting', title: 'Vesting', question: 'What is the vesting for the receiving party?', field: 'vesting', placeholder: 'Community Property with Right of Survivorship' },
    ]
  },
  'interspousal-transfer': {
    docType: 'interspousal-transfer',
    steps: [
      { id: 'xfer-spouse', title: 'Parties', question: 'Which spouse is transferring ownership?', field: 'grantorName', placeholder: 'Spouse A', required: true, validate: validators.name('Transferring spouse') },
      { id: 'recv-spouse', title: 'Parties', question: 'Which spouse will own the property after transfer?', field: 'granteeName', placeholder: 'Spouse B', required: true, validate: validators.name('Receiving spouse') },
      { id: 'dtt-exempt', title: 'Transfer Tax', question: 'Reason for Documentary Transfer Tax exemption (if any)?', field: 'dttExemptReason', placeholder: 'Interspousal transfer (R&T §11927)' },
    ]
  },
  'warranty-deed': {
    docType: 'warranty-deed',
    steps: [
      { id: 'grantor', title: 'Parties', question: 'Who is granting title?', field: 'grantorName', placeholder: 'John A. Smith', required: true, validate: validators.name('Grantor') },
      { id: 'grantee', title: 'Parties', question: 'Who will receive title?', field: 'granteeName', placeholder: 'The Smith Family Trust (dated 03/14/2020)', required: true, validate: validators.name('Grantee') },
      { id: 'covenants', title: 'Covenants (optional)', question: 'Add covenant language (or leave blank).', field: 'covenants', placeholder: 'Grantor covenants that Grantor is lawfully seized...' },
    ]
  },
  'tax-deed': {
    docType: 'tax-deed',
    steps: [
      { id: 'grantor-tax', title: 'Parties', question: 'Confirm the Grantor (tax collector or authority).', field: 'grantorName', placeholder: 'County Tax Collector', required: true, validate: validators.name('Grantor') },
      { id: 'grantee-tax', title: 'Parties', question: 'Who is the Grantee (buyer from the tax sale)?', field: 'granteeName', placeholder: 'Jane Q. Public', required: true, validate: validators.name('Grantee') },
      { id: 'tax-sale-ref', title: 'Tax Sale', question: 'What is the Tax Sale reference (ID or date)?', field: 'taxSaleRef', placeholder: 'TS-2025-001 / June 15, 2025' },
    ]
  },
};
