import { redirect } from 'next/navigation';
import { aliasTarget } from '@/lib/requestsFocus';

/**
 * A PERMANENT ALIAS, not a migration window.
 *
 * ═══ WHY IT NEVER COMES OUT ═══
 *
 * `/shared-deeds?focus={id}` is in emails that have already been sent —
 * the approval notice and the schedule notice both build it, and an
 * email in somebody's inbox is immutable. This route stops working the
 * day it is deleted, for messages nobody can edit. Same standing as
 * `/create-deed` and `/settings`; see docs/DASH1_REQUESTS_MERGE.md.
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
 * cannot: `?focus=42` arriving here means a review, and it leaves here
 * saying so. Every already-sent link therefore lands on the right row
 * rather than on the right number in the wrong list.
 */
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SharedDeedsAlias({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Flattened here and decided in `lib/requestsFocus.aliasTarget`, so the
  // rule can be called by a test with a query string instead of being
  // read out of this file. A redirect is the one thing a source-reading
  // pin cannot check: it either happens or the officer is at a 404.
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) entries.push([key, v]);
  }

  redirect(aliasTarget(entries));
}
