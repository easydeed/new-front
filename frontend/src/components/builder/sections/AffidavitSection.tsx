'use client';

// FORMS-SPIKE: the affidavit's officer-supplied facts. Every field here is
// TYPED by the officer (names auto-uppercase like the deed parties) — no
// confirm affordances: typing is the officer's act; "Confirm" stays
// reserved for external-source data. The JT deed's recording reference
// (date + instrument number) identifies the instrument being cleared.
import type { AffidavitFacts } from '@/types/builder';

interface AffidavitSectionProps {
  value?: AffidavitFacts;
  onChange: (affidavit: AffidavitFacts) => void;
}

const EMPTY: AffidavitFacts = {
  affiantName: '',
  decedentName: '',
  jtDeedDate: '',
  jtDeedGrantor: '',
  jtDeedGrantees: '',
  recordingDate: '',
  instrumentNo: '',
};

export function AffidavitSection({ value, onChange }: AffidavitSectionProps) {
  const facts = value ?? EMPTY;
  const set = (patch: Partial<AffidavitFacts>) => onChange({ ...facts, ...patch });

  const field = (
    label: string,
    key: keyof AffidavitFacts,
    placeholder: string,
    opts: { uppercase?: boolean; hint?: string } = {}
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        data-builder-field={`affidavit-${key}`}
        value={facts[key]}
        onChange={(e) =>
          set({ [key]: opts.uppercase ? e.target.value.toUpperCase() : e.target.value } as Partial<AffidavitFacts>)
        }
        placeholder={placeholder}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
          opts.uppercase ? 'uppercase' : ''
        }`}
      />
      {opts.hint && <p className="text-xs text-gray-500 mt-1">{opts.hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      {field('Affiant (person swearing the statement)', 'affiantName', 'JANE B. DOE', {
        uppercase: true,
        hint: 'Usually the surviving joint tenant. Signs before a notary.',
      })}
      {field('Decedent', 'decedentName', 'JOHN A. DOE', {
        uppercase: true,
        hint: 'As named on the certified copy of the Certificate of Death.',
      })}

      <div className="pt-2 border-t border-gray-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          The joint-tenancy deed being cleared
        </p>
        <div className="space-y-4">
          {field('Deed date', 'jtDeedDate', 'June 1, 2015')}
          {field('Executed by (grantor on that deed)', 'jtDeedGrantor', 'ROBERT SELLER', { uppercase: true })}
          {field('To (grantees, as joint tenants)', 'jtDeedGrantees', 'JOHN A. DOE AND JANE B. DOE', {
            uppercase: true,
          })}
          {field('Recorded on', 'recordingDate', 'June 15, 2015')}
          {field('Instrument No.', 'instrumentNo', '2015-0654321', {
            hint: 'From the recorded JT deed — this is how the recorder ties the two documents.',
          })}
        </div>
      </div>

      <p className="text-xs text-gray-500 pt-1">
        A certified copy of the death certificate must be attached to the
        recorded affidavit — the generated form says so on its face.
      </p>
    </div>
  );
}
