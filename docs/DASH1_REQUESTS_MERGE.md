# DASH1 item 7 — merging Signings and Shared Deeds into "Requests"

**Investigation. Cost reported before building, as ruled.** Verified
against `main` at the DASH1 (1/2) merge.

---

## The recommendation, first

**Do it — but as a rename and a redirect, not a rebuild.** ~1 day.

FLOW1 item 3 already did the expensive half. Shared Deeds fetches both
feeds, renders both kinds under a filter, and cross-links to Signings.
What remains is mostly naming, one page's worth of detail rendering, and
the redirect obligations below.

The alternative — leave them separate — is now the more expensive
option, because the seam it leaves has to be re-explained on every
surface that links to either.

---

## What is actually left

| Piece | Est. | Note |
|---|---|---|
| Rename `/shared-deeds` → `/requests`, permanent redirect | 0.25 d | see the constraint below |
| Fold the agenda's *upcoming/being-arranged* grouping in | 0.25 d | the merged page currently sorts signings by nothing |
| Move the expandable signing detail across | 0.25 d | `SigningDetail` lifts as-is |
| Retire `/signings`, redirect to `/requests?kind=signings` | 0.1 d | |
| Update inbound links, pins, sidebar | 0.15 d | 37 references, mechanical |
| **Total** | **≈ 1 day** | |

---

## The constraint that decides HOW, not whether

**Both routes are in links that have already been sent.**

```
backend/routers/sharing.py:799   view_link = {app}/shared-deeds?focus={id}   ← approval EMAIL
backend/routers/sharing.py:1320  view_link = {app}/shared-deeds?focus={id}   ← schedule EMAIL
backend/routers/sharing.py:779   link      = /shared-deeds?focus={id}        ← in-app notification
backend/routers/sharing.py:867   link      = /shared-deeds?focus={id}        ← in-app notification
backend/routers/signing.py:862   link      = /signings?focus={id}            ← in-app notification
backend/routers/signing.py:981   link      = /signings?focus={id}            ← in-app notification
backend/routers/signing.py:1088  {APP}/signings                              ← reminder EMAIL
```

An email in somebody's inbox is immutable. So the redirects are
**permanent aliases, not a migration window** — they never come out, and
the ticket that adds them should say so in the config rather than
leaving a future reader to assume they are transitional.

The same constraint applies to the `/deed-builder` and
`/account-settings` renames in item 6 — see the deviation note below.

---

## What a merge closes, beyond tidiness

1. **The seam where a signing vanishes.** FLOW1 item 3 papered over this
   by showing both kinds; a single page removes the question rather than
   answering it twice.
2. **One `?focus=` contract instead of two.** Today `/signings?focus=`
   and `/shared-deeds?focus=` are different id spaces (`signing_requests.id`
   vs `deed_shares.id`) reached by the same-looking URL. A merged page
   needs `?kind=` alongside, and *that is a small schema decision worth
   making deliberately* rather than discovering later.
3. **The officer's own vocabulary.** She does not think "shares" and
   "signings" — she thinks "what have I got out". The page name is the
   feature.

## What a merge does NOT close

**The two row shapes stay different, and must.** A review has a viewing
and a decision; a signing has a notary, a set of times and a state.
FLOW1 item 3 deliberately refused to flatten them into shared columns —
that would put two facts under one heading, which is what item 0 spent a
whole PR on. A merged page is one page with two row renderers, not one
row type. Anybody costing this as "one table" is costing the wrong thing.

---

## Found while measuring, and fixed in this PR

**`?focus=` was being sent to Shared Deeds from five places — including
two emails — and the page had never read it.**

Every "your deed was approved" email the officer has ever clicked landed
her on an unfiltered list of every share she has, with no indication of
which one it was about. That is the same defect DASH1 item 6 fixed on the
dashboard's own links, arriving from the other end and older than any of
them.

It is fixed here rather than deferred to the merge, because a link that
does not land is a live defect and the merge is a plan.

---

## Deviation flagged — item 6's route renames

**Item 6 asked to align routes to labels** (`/deed-builder` →
`/create-deed`, `/account-settings` → `/settings`) with redirects from
the old paths. **Held, not done, and here is why.**

Measuring it surfaced something that changes the shape of the work:

- `email_templates.py:318,322` — the welcome email's "Create your first
  document" button points at `{url}/deed-builder`.
- `users_auth.py:550,551,598` — **Stripe checkout `success_url`,
  `cancel_url` and the billing-portal `return_url`** point at
  `/account-settings`. In-flight checkout sessions carry these.
- `router_webhook.py:381` — the payment-failed email.

So these are not internal renames with a courtesy redirect. They are
**permanent aliases with a money path running through one of them**, and
a Stripe return URL that 404s is a customer who paid and landed nowhere.

That is squarely inside the Tier 3 line — *anything touching money* — and
it arrived as a discovery rather than as part of the ruling, so it is
flagged rather than decided. The rename is otherwise mechanical: 29
frontend references, 14 files.

**Recommendation:** do it as its own small PR, with the permanent-alias
reasoning in `next.config`, and verify the Stripe URLs against a live
checkout before the old paths are considered safe. The sidebar grouping
and badges — the rest of item 6 — are shipped in this PR and do not
depend on it.
