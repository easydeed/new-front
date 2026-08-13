/**
 * ROLE1 — one definition of admin, in the other language.
 *
 * ═══ THE SWEEP WAS BACKEND-ONLY, AND THE BROWSER HAD THREE MORE ═══
 *
 * ROLE1 found three definitions of admin in Python, converged them onto
 * `auth.ADMIN_ROLES`, and pinned it with a sweep over `backend/**.py`.
 * The sweep could not see this half of the product. TypeScript held the
 * same four spellings, typed out as a literal array, three times:
 *
 *   - `app/login/page.tsx`   — where to send her after signing in
 *   - `app/admin/layout.tsx` — whether the console opens at all
 *   - `utils/auth.ts`        — `AuthService.isAdmin()`
 *
 * Six definitions, not three. They happen to agree today, which is
 * exactly the condition under which the seventh gets added.
 *
 * ═══ WHAT THE TOKEN NOW CARRIES ═══
 *
 * The `role` claim is an AUTHORIZATION answer — 'admin' or 'user' —
 * because the server computes it through the one predicate rather than
 * forwarding `users.role`. Before that it could read "Escrow Officer":
 * a job title in a security claim, which is why every one of these three
 * had to lowercase, trim, and compare against a list.
 *
 * They still do. Tokens minted before the change are valid for their
 * remaining lifetime and carry the old shape, and a check that assumes
 * otherwise is a check that logs somebody out of the console for holding
 * a token from ten minutes ago.
 */

/**
 * Every spelling of "this person is an administrator".
 *
 * Mirrors `ADMIN_ROLES` in `backend/auth.py`, and a test compares the
 * two files rather than trusting this comment.
 *
 * NARROWED to one, 2026-08-13, after the ROLE1 migration converged the
 * column. Three spellings were recognized because history had written
 * three; it no longer has. Narrowing before the migration would have
 * silently removed somebody's access — narrowing after removes nothing.
 */
export const ADMIN_ROLES = ['admin'] as const;

/** Does this role string mean admin? The one answer. */
export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return (ADMIN_ROLES as readonly string[]).includes(role.toLowerCase().trim());
}
