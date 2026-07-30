'use client';

// FORMS: the affidavit family's officer-supplied facts. Every field here is
// TYPED by the officer (names auto-uppercase like the deed parties) — no
// confirm affordances: typing is the officer's act; "Confirm" stays
// reserved for external-source data. WHICH facts render is registry data
// (affidavitFields), so a sibling form is one registry entry + a template.
import type { ReactNode } from 'react';
import type { AffidavitFacts } from '@/types/builder';
import { formConfig, type AffidavitFieldSpec } from '@/lib/formRegistry';

interface AffidavitSectionProps {
  deedType: string;
  value?: AffidavitFacts;
  onChange: (affidavit: AffidavitFacts) => void;
}

const EMPTY: AffidavitFacts = {
  affiantName: '',
  decedentName: '',
  recordingDate: '',
  instrumentNo: '',
};

export function AffidavitSection({ deedType, value, onChange }: AffidavitSectionProps) {
  const facts = value ?? EMPTY;
  const specs: AffidavitFieldSpec[] = formConfig(deedType)?.affidavitFields ?? [];
  const set = (patch: Partial<AffidavitFacts>) => onChange({ ...facts, ...patch });

  const field = (spec: AffidavitFieldSpec) => {
    const key = spec.key as keyof AffidavitFacts;
    return (
      <div key={spec.key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{spec.label}</label>
        <input
          type="text"
          data-builder-field={`affidavit-${key}`}
          value={facts[key] ?? ''}
          onChange={(e) =>
            set({ [key]: spec.uppercase ? e.target.value.toUpperCase() : e.target.value } as Partial<AffidavitFacts>)
          }
          placeholder={spec.placeholder}
          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
            spec.uppercase ? 'uppercase' : ''
          }`}
        />
        {spec.hint && <p className="text-xs text-gray-500 mt-1">{spec.hint}</p>}
      </div>
    );
  };

  // Render a group heading each time the spec's group label changes.
  const blocks: ReactNode[] = [];
  let lastGroup: string | undefined;
  for (const spec of specs) {
    if (spec.group && spec.group !== lastGroup) {
      blocks.push(
        <div key={`group-${spec.group}`} className="pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            {spec.group}
          </p>
        </div>
      );
    }
    lastGroup = spec.group;
    blocks.push(field(spec));
  }

  return (
    <div className="space-y-4">
      {blocks}
      <p className="text-xs text-gray-500 pt-1">
        A certified copy of the death certificate must be attached to the
        recorded affidavit — the generated form says so on its face.
      </p>
    </div>
  );
}
