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

---

# ADDENDUM — the rename should not happen

**Written on starting the rename PR. Held before writing any code.**

Both target routes **already exist**, as redirects pointing the other
way, and one of them is a deliberate prior migration.

```
frontend/src/app/create-deed/page.tsx            → redirect('/deed-builder')
frontend/src/app/create-deed/[docType]/page.tsx  → redirect('/deed-builder/{type}')
                                                    (preserves the slug AND the query string)
frontend/src/app/settings/page.tsx               → redirect('/account-settings')
```

## What that changes

**`/create-deed` was the ORIGINAL route.** Its own comment records the
migration: *"Legacy picker route. DeedBuilder at /deed-builder is the
canonical entry. This file used to render a deed-type picker that mounted
the 5-step wizard; now it server-redirects."* Reversing it would undo a
decision somebody made on purpose, and the sub-route is not a straight
swap either — the param is `[docType]` on one side and `[type]` on the
other.

**`/settings` was added for exactly the reason item 6 gives.** X2.1's
comment: *"/settings 404'd while nav labels say 'Settings' (the real page
lives at /account-settings). A typed or bookmarked /settings now lands on
the real page instead of a dead end."*

So **the intent of the sub-item is already satisfied, in both cases,
deliberately.** She cannot hit a dead end typing either address. What
remains of the "drift" is that the canonical URL differs from the label —
visible only in the address bar.

## What reversing would cost

| Cost | Detail |
|---|---|
| Undoes a prior migration | `/create-deed` → `/deed-builder` was chosen; this un-chooses it |
| A param rename | `[docType]` vs `[type]` — the legacy route already translates between them |
| **A redirect hop on a money path** | the Stripe `return_url` would point at an alias rather than the canonical route |
| A hop in the welcome email | same, for `/deed-builder` |

For a benefit nobody sees unless they read the address bar.

## Recommendation

**Close the route-rename sub-item as already satisfied.** Ship nothing.
The rest of item 6 — grouping and badges — is merged.

If the canonical URLs are still wanted for their own sake, that is a
product decision about vocabulary rather than a defect fix, and it should
be ruled as one, with the Stripe check below done first regardless.

## The Stripe check stands on its own — owner, Tier 3

This is worth doing **whether or not anything is renamed**, because a
success URL configured in the Stripe dashboard rather than in code is a
live risk today.

In code, these three are built from `FRONTEND_URL`:

```
backend/routers/users_auth.py:550   success_url = {FRONTEND_URL}/account-settings?success=true
backend/routers/users_auth.py:551   cancel_url  = {FRONTEND_URL}/account-settings?canceled=true
backend/routers/users_auth.py:598   return_url  = {FRONTEND_URL}/account-settings      ← billing portal
```

**What to confirm, on a live test checkout at the $99 price:**

1. After paying, where does the browser land? It should be
   `/account-settings?success=true` on the production host.
2. After cancelling, the same for `?canceled=true`.
3. From the billing portal, does "Return to DeedPro" land on
   `/account-settings`?
4. **In the Stripe dashboard**, check *Settings → Billing → Customer
   portal* for a configured **default return URL**. If one is set there,
   it OVERRIDES nothing in our code — it is used when the portal session
   does not supply one — but it is a second place the URL lives, and it
   will not move when code moves.
5. Confirm `FRONTEND_URL` is set on the production API service. If it is
   unset, every one of these falls back to `http://localhost:3000` and a
   paying customer lands nowhere. **That is the check with the real
   dollar behind it, and it is independent of any rename.**

---

# STEP 1, AS BUILT

The merge ships in two units. This records what step 1 actually did, and
what it deliberately did not.

## What step 1 did

The tracker moved from `/shared-deeds` to `/requests` — `git mv`, so the
history follows the file. `/shared-deeds` remains, as a permanent alias
whose whole body is a `redirect()`. Every in-app navigation was repointed
at the new route; the sidebar entry is now "Requests".

## The id space, and why the alias is load-bearing rather than polite

Two pages became one, and their rows are keyed off different tables: a
review is a `deed_shares.id`, a signing is a `signing_requests.id`.
Review 42 and signing 42 both exist and are different deeds belonging to
different people. So on the merged page `?focus=42` names two rows, and
the thing that used to disambiguate it — the path — is gone.

The alias supplies what the number cannot. An id arriving at
`/shared-deeds` came from the reviews table, because that is the only
thing that path has ever meant, and the redirect says so on the way
through. **That is the alias's real job.** Serving old mail is the reason
it can never be deleted; recovering the kind is the reason it is not
merely a courtesy.

A `?focus=` with no `?kind=` is genuinely ambiguous and is treated as
such: the filter stays on "all" and nothing is highlighted. Guessing
"reviews first" would be right most of the time and silently highlight a
stranger's signing the rest — a tie-breaking rule invents an answer that
will be right often enough that nobody checks it. An unhighlighted list
is merely a list; a highlighted wrong row is an assertion.

## The alias serves history and stops growing it

The four backend links that built `/shared-deeds?focus={id}` — two emails
and two in-app notifications — now build `/requests?kind=reviews&focus=`.

The argument that makes the alias permanent is that sent mail cannot be
edited, and that argument covers exactly the mail that was already sent.
A backend that kept emitting the old path would grow the population of
legacy links forever and make the alias self-justifying: every year more
inboxes would hold the old path, because we had spent that year putting
it there. Two pins hold this — one that no new link is minted at the
retired path, one that no `/requests` focus link goes out without its
kind.

## A trap worth naming: the page and the endpoint share a name

`/shared-deeds` is a frontend route AND a backend endpoint. Repointing
the navigation caught `apiFetch('/shared-deeds', {method: 'POST'})` in
the review modal on the way past, which would have 404'd every review
share on the first click. Caught before commit, and pinned: the frontend
ROUTE moved, the backend ENDPOINT did not.

## What the guard sweep learned

The route-level auth sweep flagged the alias, correctly — it is a page
with no guard. Asking a redirect stub to guard would be worse than
pointless: it would bounce the visitor to login from the alias and lose
the parameters the alias exists to forward, when the destination guards
anyway.

Three such stubs (`/settings`, `/create-deed`, `/create-deed/[docType]`)
were already exempted by name on the PUBLIC allowlist, and this would
have been the fourth. A hand-kept list of one repeating shape stops being
read — entry four goes in because one through three are there, and the
day somebody adds a name that is *not* a stub, nothing objects. So the
exemption is now proved rather than listed: a route qualifies only if it
imports `redirect`, calls it, and contains no fetch, no token read, no
storage, no state and no rendered markup. The classifier carries a floor
assertion at both ends — it must still recognise the known stubs, and
must never claim a real screen.

## Deferred to step 2, deliberately

- Folding the agenda's upcoming / being-arranged grouping into the
  merged page.
- Moving the expandable signing detail across.
- Retiring `/signings` to an alias of its own.

Splitting here keeps step 1 reviewable as what it is — a rename with an
id-space recovery — rather than mixing it with a layout change. **The two
row shapes stay different, and must**: a merged page is one page with two
row renderers, not one row type.

## Noted, not fixed

The Share button on the deed preview pushes `/requests?deed={id}`, and
nothing reads `?deed=`. Pre-existing — it predates the merge and the
rename only carried it across — so it lands the officer on an unfiltered
tracker instead of opening a share dialog. Same class as the `?focus=`
defect DASH1 found. Ledgered rather than widened into this PR.

---

# STEP 2, AS BUILT

The agenda folds in, `/signings` retires to an alias, and the merge is
finished. What follows is what step 2 actually did, including the two
things it found on the way that were not in its scope note.

## Two row shapes, kept apart on purpose

Step 1 left the signings half rendering as rows in the reviews table:
eight columns designed for a recipient and a decision, five of which a
signing could fill honestly, two saying "—", and an Actions cell offering
"Open in Signings". That button would have pointed at a redirect back to
the page it was on.

So the signings half is now the agenda, unchanged — the stuck banner, the
three groups, the expandable detail — rendered as its own section below
the reviews table. **A merged page is one page with two row renderers,
not one row type.** The filter chips choose which sections show; the
unfiltered view stacks both.

This is not a new design so much as the existing one finished. The page
already rendered two independent blocks gated by the same filter; they
merely shared a `<tbody>`.

## FOUND: one contract, declared twice, already drifted

`GET /signing-requests/v2` had two screens declaring what its rows
contain. The agenda declared fourteen fields. The merged tracker declared
eleven.

The three it was missing were `live`, `days_waiting` and `stale` —
exactly the fields CANCEL1 and DASH1 added so that a screen would stop
deciding for itself which signings are over and which have gone quiet.

A screen that does not declare a field cannot render it. So the merged
tracker listed cancelled and expired signings among the live ones, and
could not mark a single stuck request — the signal the agenda's entire
design leads with. No test failed, because nothing compared the two
declarations.

That is FLOW1 item 0's defect one endpoint over, and milder only by luck:
there the names were WRONG and rendered as `undefined`; here they were
ABSENT and rendered as nothing at all.

The fix is the shape FLOW1 item 0 already established rather than a
one-line addition: `signing_summary_keys.json` is the corpus, the Python
builder asserts its emitted key set equals it BY EQUALITY, and the single
TypeScript declaration is checked against the same list. Drift now costs
two deliberate edits instead of one silent omission.

## FOUND: a blank page, from four individually-correct conditions

Filtered to Reviews, with no reviews but several signings: the reviews
table did not render (no reviews), the agenda did not render (filtered
out), and the page's "nothing here yet" did not render either — because
it tested whether BOTH lists were empty, and one of them was not.

Every condition was right on its own. The officer got a header, a filter,
and nothing underneath. Same shape as CANCEL1 item 2, where two correct
behaviours composed into a null result.

Four booleans spread across two hundred lines of JSX cannot be reasoned
about at the place each one is written, so they became
`lib/requestsSections.ts` — and the pin sweeps every combination of
filter and count asserting that at least one section always renders,
rather than trusting a reading of the conditions. The first draft of the
extracted function reproduced the bug from the other side (filtered to
Signings with none, all three came back false); the sweep caught it.

## CORRECTED: a guard against a collision that cannot happen

The grouping was first written with a `live &&` test on the booked group,
to stop a cancelled-but-booked signing appearing in both Booked and
Closed.

It cannot appear in both. `signing_loop.request_state` tests
`cancelled_at` BEFORE `booked_at`, so a cancelled request reports
`cancelled`, never `booked`, whatever was arranged. The guard was dead
code carrying a false explanation — worse than no guard, because the next
reader would have believed the collision was real and defended against it
somewhere else too.

Deleting it makes that ordering load-bearing, so the ordering is now
pinned where it is decided rather than assumed where it is depended on:
`test_cancellation_beats_booking_in_the_state_vocabulary`, with a control
case so the pin reads the order rather than a constant.

## THREE MORE STRING-PRESENCE PINS, SAME LEDGERED CLASS

Moving the row builder into a service broke three Python pins that
matched source spellings — `'"live": loop.is_live('`, `'"stale": ('`,
`'"created_at": _iso(row.get(...))'` — with the behaviour unchanged. Each
would equally have stayed green if the field had been computed and then
dropped before the response left.

All three now read the corpus, which cannot be satisfied by a spelling
and cannot be evaded by an omission. One of them was also reading
`app/signings/page.tsx` for a threshold, which after this ticket is a
forty-line redirect: a pin that would have passed because there was
nothing left to look at.

## The second alias, and why the function took a parameter

`/signings` is now a permanent alias with the same job as
`/shared-deeds`: catch already-sent mail, and supply the kind its path
used to imply. The schedule notice and the dispatch-declined notice are
both emails.

`aliasTarget` gained a `kind` parameter rather than being copied. Two
copies of that function with one word changed is how the two aliases
would come to disagree about the spelling of `kind` — and each
disagreement is a whole category of already-sent mail landing on the
wrong list. The pin round-trips both kinds through alias and page.

The two in-app links that pointed at `/signings?focus=` (the dashboard
queue and Past Deeds' row action) now carry `kind=signings`, and the pin
that forbids fresh links at a retired path covers both aliases.

## Deferred, and named

The expandable detail exists because there is no officer-facing page for
a single signing. If DEEDDETAIL ships a deed's workflow page, the panel
may become redundant — the row would navigate there instead. Moving it
was still right: the alternative was leaving `/signings` un-retired and
the merge half-done. Flagged so the cost is known rather than discovered.
