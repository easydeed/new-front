# W0 — Embeddable Widget + Submission API: Investigation & Proposal

**Status: PROPOSAL for owner + red-team review. No tickets exist yet; nothing here is committed work.**
Investigation only — read-only sweep of the existing partner API, the doctrine
constraints, and the commercial gaps. The central design decision (§3) is the
owner's to make; everything else sequences behind it.

---

## 1. What exists today

The external partner API (`/api/v1/*`) is real, live, and already
doctrine-adjacent — this is an evolution, not a greenfield.

**Auth model.** Org-scoped API keys, stored hashed with prefix lookup,
carrying: `scopes` (list), `rate_limit_hour` / `rate_limit_day`, `is_active`,
and `is_test` (a sandbox notion already exists at the key level). Admin panel
mints and revokes keys. Every call is usage-logged (`api_usage_log`) and
rate-limited via windowed counters, with `X-RateLimit-*` response headers.

**Surface.**

| Endpoint | What it does |
|---|---|
| `POST /api/v1/deeds` | Full deed submission: property (address/county/APN/legal), grantor (+optional address), grantee (+vesting), transfer tax (exempt/code or amount), recording info. CA-only validated. |
| `GET /api/v1/deeds/{id}` | Deed status + metadata |
| `GET /api/v1/deeds/{id}/pdf` | The rendered PDF |
| `GET /api/v1/deeds` | List the org's deeds |
| `POST /api/v1/transfer-tax/calculate` | DTT calculation as a service |
| `GET /api/v1/verify/{document_id}` | Document verification |

**Render path.** Since the doctrine sweep (#52), API deeds render through the
same G2/G3 chassis templates as the first-party flow — recorder-ready
geometry, statutory furniture, no chrome. Since PS3, they render through
WeasyPrint, the engine the whole harness verifies. API deeds live in their own
table (`api_deeds`) with stored PDFs.

**What a partner can already do today:** submit complete deed data
server-to-server and get back a chassis-rendered, hash-stamped PDF. What they
cannot do: anything resembling suggest→confirm→record — the API accepts
asserted-complete data with **no confirmation model at all**. That gap is the
whole subject of §3.

## 2. Widget architecture options

The doctrine question first, because it decides the architecture: **the
confirming officer must be a person, their confirmations must be explicit
acts, and the record must capture who/what/when.** Any embed that lets a
partner's *system* skip that is not our product; it's a liability shaped like
our product.

| Option | Shape | Doctrine fit | Cost |
|---|---|---|---|
| **A. Hosted flow (redirect)** | Partner deep-links to `deedpro.com/embed/new?session=…`; officer completes the deed in OUR UI; webhook/redirect returns them | **Perfect** — our gate, our confirmations, our provenance, unmodified | Lowest. Mostly exists (the builder + a session-handoff endpoint) |
| **B. Embedded iframe** | Our builder inside the partner's page via iframe + postMessage | **Same as A** — the UI is still ours, confirmations still happen in our surface; postMessage only carries lifecycle events (started/completed/deed_id) | Medium: CSP/frame-ancestors per partner, responsive-in-frame work, postMessage contract |
| **C. JS SDK (native components)** | Partner composes our React/JS components into their own UI | **Dangerous** — the partner controls the DOM around (and over) our confirm affordances; we can't prove the officer saw what we think they saw | High, and the audit story degrades from "our record" to "our components, their context" |

**Recommendation: A first, B second, C never (or not until a partner pays for
the legal review it requires).** A and B share the property that the
confirmation UI *travels intact* — the officer confirms in a surface we ship,
so provenance records mean the same thing they mean first-party.

**Where provenance lives (A/B):** exactly where it lives today —
`deeds.metadata.provenance`, stamped by our UI. New fields needed: the
*acting officer identity* asserted by the partner session (see §3) and the
*embedding origin*, so the record says "confirmed in DeedPro embed on
partner.example.com by officer token X."

**Who owns the audit record:** we do, in both A and B. The partner gets read
access via API (their org's deeds), plus the PDF and its hash. That's a
selling point, not a concession: "the deed's confirmation record is
independently held" is what their E&O carrier wants to hear.

## 3. API submission model — the central design decision

Can `POST /api/v1/deeds` accept "officer X confirmed field Y at time Z" as an
assertion, or must confirmation happen in our UI?

**Model 1 — Trust-but-record (asserted confirmations).**
The API request grows a `confirmations` block: per material field, `{officer_id,
officer_name, confirmed_at, source}`. We validate shape, record verbatim, and
stamp the provenance entries `source: "partner-asserted"` — never
indistinguishable from first-party confirmations.

- *Liability shape:* the partner warrants the confirmations; our record shows
  we received assertions, not that we witnessed acts. The deed face is
  identical, but the audit story is "Partner Corp told us their officer
  confirmed this." Requires contract language (partner indemnity for asserted
  confirmations) before the first real key.
- *Who wants it:* SoftPro/Qualia-class integrators whose officers already work
  in their own UI all day. This is the model that closes big integrations.

**Model 2 — Confirmation stays in our UI (hybrid handoff).**
The API accepts *data* but the deed lands as a **draft**; generation is locked
until an officer opens it (hosted flow or embed) and walks the normal gate.
API response returns a `confirmation_url` the partner routes their officer to.

- *Liability shape:* identical to first-party — every confirmation is an act
  in our surface, recorded by us. The strongest story we can tell.
- *Cost:* one more hop in the partner's workflow; some integrators will balk.

**Recommendation: build Model 2 first and price Model 1 as the enterprise
tier.** Model 2 is small (the draft-then-resume machinery from U1/R already
exists — an API-created draft is just a draft with an org owner), it ships the
embed story end-to-end, and it never weakens the record. Model 1 is then a
deliberate, contract-gated upgrade whose provenance entries are permanently
marked as assertions — the two-tier rule preserved in data, visible in any
future audit. **This ordering also means the widget (§2A/B) and the API
converge on one mechanism: everything is a draft until an officer confirms it
somewhere we can prove.**

Red-team question to answer before Model 1 ships: what stops a partner from
scripting the assertions? Answer to defend: nothing technical — that's why the
provenance marking, the contract indemnity, and per-key `partner-asserted`
volume metrics (visible in the admin panel) all exist before the first key
with that scope is minted.

## 4. Commercial gaps (what real partner onboarding still needs)

| Gap | State today | Needed |
|---|---|---|
| Rate limits | ✅ per-key hour/day windows + headers | Per-plan defaults; overage behavior decision |
| Sandbox | ⚠️ `is_test` flag exists on keys | Route `is_test` keys to a sandbox org whose deeds are watermarked DRAFT/TEST and excluded from verify; document it |
| Webhooks | ❌ none (zero webhook code) | `deed.completed` / `deed.confirmed` callbacks with signed payloads (HMAC per key); retry queue |
| Per-partner branding | ❌ none | *Recorded pages must stay chrome-free (Gov C §27361.7) — "branding" can only mean the embed UI shell, never the document.* Small allowlisted theme config for the hosted/embed surface |
| Key lifecycle | ⚠️ admin mints/revokes | Self-serve rotation, expiry, scope editing; key-scoped docs page |
| Docs | ⚠️ `/api/v1/openapi.json` + `/docs` index | A real partner quickstart: auth, sandbox, the confirmation model (§3), webhook contract |
| Billing | ❌ usage log exists, unbilled | Usage-based invoicing off `api_usage_log` (Stripe metering) — later; contracts can carry the first partners |

## 5. Sequencing — smallest sellable slice first

1. **W1 — Hosted confirmation flow (Model 2 core).** API-created deeds land as
   org-owned drafts + `confirmation_url`; officer completes them in the
   existing builder; U1/R machinery does the rest. *Sellable alone:* "API in,
   officer-confirmed recorder-ready PDF out."
2. **W2 — Webhooks + sandbox hardening.** `deed.completed` callbacks (signed),
   `is_test` keys → watermarked sandbox org. Makes W1 integrable without
   polling.
3. **W3 — Embed (iframe) of the confirmation flow.** frame-ancestors
   allowlist per key, postMessage lifecycle events, origin recorded into
   provenance. The "embed deed prep into YOUR platform" demo.
4. **W4 — Model 1 (asserted confirmations), enterprise-gated.** Contract
   language first; `partner-asserted` provenance marking; admin-panel
   assertion-volume visibility. Priced accordingly.
5. **W5 — Commercial polish.** Self-serve keys, quickstart docs, usage
   billing.

Each slice is independently shippable and none weakens the record. The pitch
sentence after W1+W3: *"Your officers, your platform, our gate — and an
independently held confirmation record on every deed."*

---

*Prepared as W0 (investigation only). No code was changed. Awaiting owner
review and red-team pass on §3 before any W-series ticket is written.*
