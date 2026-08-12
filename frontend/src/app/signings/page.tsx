import { redirect } from 'next/navigation';
import { aliasTarget } from '@/lib/requestsFocus';

/**
 * A PERMANENT ALIAS, not a migration window.
 *
 * ═══ WHY IT NEVER COMES OUT ═══
 *
 * `/signings?focus={id}` has been built by the dashboard queue, by Past
 * Deeds' row action, and by the schedule notice — and the notice is an
 * EMAIL, which cannot be edited once it is in somebody's inbox. This
 * route stops working the day it is deleted, for messages nobody can
 * recall. Same standing as `/shared-deeds`, `/create-deed` and
 * `/settings`; see docs/DASH1_REQUESTS_MERGE.md.
 *
 * ═══ AND THIS IS WHERE THE ID SPACE IS RECOVERED ═══
 *
 * The merged page shows two kinds of request whose ids come from
 * different tables — a review is a `deed_shares.id`, a signing is a
 * `signing_requests.id`. On one page `?focus=42` is ambiguous and must
 * be treated as such.
 *
 * The OLD path is not ambiguous, because the path itself said which
 * table the id came from. So the alias supplies what the bare number
 * cannot: `?focus=42` arriving here means a signing, and it leaves here
 * saying so.
 *
 * ═══ WHAT USED TO BE HERE ═══
 *
 * The agenda — the stuck banner, the three groups, the expandable
 * detail. It moved to `features/signing/SigningAgenda.tsx` and renders
 * as the signings half of `/requests`, unchanged. It did not become a
 * table: the two row shapes stay different, and must.
 */
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SigningsAlias({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Flattened here and decided in `lib/requestsFocus.aliasTarget` — the
  // same function the reviews alias calls, with the other kind. Two
  // copies of it is how the two aliases would come to disagree about the
  // spelling of `kind`.
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) entries.push([key, v]);
  }

  redirect(aliasTarget(entries, 'signings'));
}
