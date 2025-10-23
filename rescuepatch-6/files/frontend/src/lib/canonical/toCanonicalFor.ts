// frontend/src/lib/canonical/toCanonicalFor.ts
// Single entry point for canonical mapping used by ModernEngine.
// If your project already has one, keep it and ensure ModernEngine imports from here.

type AnyObj = Record<string, any>;

export function toCanonicalFor(docType: string, state: AnyObj): AnyObj {
  // Minimal canonical structure; extend as needed per deed type.
  return {
    deedType: docType,
    property: {
      address: state?.propertyAddress || '',
      apn: state?.apn || '',
      county: state?.county || '',
      legalDescription: state?.legalDescription || ''
    },
    parties: {
      grantor: { name: state?.grantorName || '' },
      grantee: { name: state?.granteeName || '' }
    },
    vesting: { description: state?.vesting || '' }
  };
}
