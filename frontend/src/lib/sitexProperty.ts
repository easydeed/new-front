/**
 * The SiteX response → PropertyData mapping.
 *
 * IT LIVES HERE SO IT CAN BE PINNED. It used to be a closure inside
 * PropertySection, which meant the only way to ask "can a vesting
 * characterization reach a fact position on the county-record path" was to
 * render a component with a Google-autocomplete dependency and an AI
 * context — so nobody asked, and the answer was yes for months.
 *
 * A rule you can only test through a UI is a rule you do not test.
 */
import type { PropertyData, Sourced } from '@/types/builder';
import { ownerCandidates } from './vestingSplit';

export interface SiteXProperty {
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  zip?: string;
  apn?: string;
  legal_description?: string;
  primary_owner?: { full_name?: string };
  secondary_owner?: { full_name?: string };
  owner_name?: string;
}

/**
 * Join the owner names the county record returns as separate fields.
 *
 * Note what this does NOT do: it does not infer a relationship from them.
 * Two people with the same surname are not evidence of a marriage, and a
 * marriage is not evidence of community property. Those are legal
 * conclusions and this function transcribes.
 */
export function formatOwnerName(
  primary?: { full_name?: string },
  secondary?: { full_name?: string },
): string {
  const names: string[] = [];
  if (primary?.full_name) names.push(primary.full_name.toUpperCase());
  if (secondary?.full_name) names.push(secondary.full_name.toUpperCase());
  return names.join(' AND ') || '';
}

export function mapSiteXResponse(data: SiteXProperty, fallbackAddress: string): PropertyData {
  const apn = data.apn || '';
  const legalDescription = data.legal_description || '';
  const ownerRaw = data.owner_name || formatOwnerName(data.primary_owner, data.secondary_owner);

  // DOCTRINE A / H1 §2.2 — the county record hands us the parties and the
  // vesting characterization welded into one `OwnerName` string, and this
  // mapping used to land the whole thing in `provenance.owner`, a FACT
  // position. The officer was then asked to confirm "HUSBAND AND WIFE AS
  // JOINT TENANTS" with the same amber button she uses for an APN, and the
  // confirmation record showed her accepting a transcription when what she
  // accepted was a legal conclusion.
  //
  // Now the split runs first, through the same module the prelim parser
  // uses. Only the PARTIES become the owner fact; the characterization
  // becomes a proposal that reaches the deed through the officer's
  // acceptance or not at all; the composite survives verbatim for audit. A
  // string we cannot split confidently offers NEITHER half.
  const split = ownerCandidates(ownerRaw, 'sitex');
  const owner = split?.owner?.value ?? '';

  // SiteX-sourced legal values arrive as unverified candidates. The officer
  // must confirm (or edit) each one before it counts as authorized.
  const candidate = (value: string): Sourced<string> => ({
    value,
    source: 'sitex',
    status: 'candidate',
  });

  return {
    address: data.address || fallbackAddress,
    city: data.city || '',
    county: data.county || '',
    state: data.state || 'California',
    zip: data.zip_code || data.zip || '',
    apn,
    legalDescription,
    owner,
    provenance: {
      apn: candidate(apn),
      legalDescription: candidate(legalDescription),
      owner: candidate(owner),
    },
    ...(split
      ? {
          ownerSplit: {
            verbatim: split.verbatim,
            mixedContent: split.mixedContent,
            ...(split.vestingProposal ? { vestingProposal: split.vestingProposal } : {}),
            ...(split.needsReview ? { needsReview: split.needsReview } : {}),
          },
        }
      : {}),
  };
}
