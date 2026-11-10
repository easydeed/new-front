# Tax deed API repair proposal

Prepared 2026-11-09; containment status updated 2026-11-10. Full tax-deed legal/form restoration remains a proposal for owner and domain review. After the original P02 hold, the owner separately approved temporary containment and eight-type P02 acceptance. [Containment review 303](https://github.com/easydeed/new-front/pull/303) is merged on main as `6a37115c`, with green exact-head and post-merge checks. [P02 review 302](https://github.com/easydeed/new-front/pull/302) now requires eight positive PDF cases plus explicit held-tax refusal/no-artifact evidence; its original ninth-case failure remains historical evidence, not a repaired form.

## Recommendation

Do not treat `tax_deed` as an ordinary grant deed with a different title. The approved first platform slice holds new tax-deed creation and pending approval while retaining access to stored documents. P02 may complete for the eight available types after its own gates pass. Restoring tax-deed generation still requires deciding the authorized county workflow, form and explicit instructions below; containment does not supply those decisions.

## Reproduced failures

The synthetic request used the existing documented valid payload, `deed_type = tax_deed`, grantor `José García`, grantee `Zoë O’Neill`, supplied vesting, and a non-exempt transfer-tax declaration with a computed amount. The real local API accepted it and produced a stored preview. PDF text preserved the purchaser but omitted the supplied grantor and printed an exempt declaration instead of the caller's non-exempt instruction. The same grantor-preservation test fails independently in Linux CI: [run 42687636735](https://github.com/easydeed/new-front/actions/runs/42687636735).

This is not a P02 validator regression. The behavior is in the unchanged template/context/catalog on baseline main `a7321b63`. P02 makes the contradiction visible by checking real PDF text, rather than merely whether rendering returned bytes. Eight other variants preserve the tested names; that is not a certification of their complete legal sufficiency.

| Input or representation | Existing behavior | Verified source |
|---|---|---|
| `grantor.name` | Accepted, saved and returned as a party, but the tax template does not read `grantors_text` | `backend/routers/api_v1/router.py:102`, `:465`; `backend/services/deed_pdf.py:113`; `templates/tax_deed_ca/index.jinja2:156` |
| `grantee.vesting` | Required by the API's ordinary `TypeRules`, but absent from the tax template | `backend/services/api_catalog.py:99`; `frontend/src/lib/apiDocs.ts:47`; `templates/tax_deed_ca/index.jinja2:162` |
| `transfer_tax` | Accepted and mapped into `dtt`; the template instead prints a fixed exemption and statutory citation | `backend/routers/api_v1/router.py:68`; `backend/services/deed_pdf.py:127`; `templates/tax_deed_ca/index.jinja2:143` |
| Sale facts | Template has slots for reference, date, price and delinquent years; the shared context does not provide them | `templates/tax_deed_ca/index.jinja2:149`; `backend/services/deed_pdf.py:111` |
| County official | Template has a `tax_collector_name` slot that the public schema/context do not populate | `templates/tax_deed_ca/index.jinja2:196`; `backend/services/deed_pdf.py:111` |
| Proceedings and redemption | Template prints compliance/expiration recitals without corresponding instructed facts in the API model | `templates/tax_deed_ca/index.jinja2:156`; `backend/schemas/api_v1/deeds.py:117` |
| Deed date | API pins the generic execution date to create time; no tax-sale/effective-date instruction is accepted | `backend/routers/api_v1/router.py:536`; `backend/services/api_confirm.py:140` |

The absence of a collector name is not, by itself, a ruling that a physical signature or execution field should be prefilled. Recital identity and another party's physical act must be distinguished before mapping anything into that slot.

## Why the legal design cannot be guessed

The currently hosted State Controller manual distinguishes Chapter 7 and Chapter 8 sales, describes execution/recordation responsibilities, and identifies sale facts needed in the deed. It also distinguishes the sale/effective date from later acknowledgment or recording. Its transfer-tax section and public-agency exception do not support treating every tax deed as automatically exempt. These are review inputs, not instructions to infer a transaction's legal status. [State Controller manual, sections 8401, 8411–8415 and 8426, printed pages 46–50](https://sco.ca.gov/Files-ARD-Tax-Info/Tax-Collector-Ref-Man/ctcrm_chapter8.pdf#page=46).

The State Controller's hosted SCO 8-19 sample identifies the county tax collector as seller, includes sale-specific facts, and has a transfer-tax amount/declarant area. It does not justify replacing every supplied declaration with the current fixed exemption. The sample is labeled 2017; it is a reference for review, not an approved DeedPro replacement template. [SCO 8-19 sample](https://www.sco.ca.gov/Files-ARD-Tax-Info/Tax-Collector-Ref-Man/sco8-19.pdf).

Sacramento County's recorder guidance describes section 11922 in terms of a governmental agency acquiring title, not a blanket exemption whenever a government agency is involved. Counsel must verify the applicable law, transaction and recording jurisdiction before any revised exemption behavior is approved. [Sacramento County exemption guidance](https://ccr.saccounty.gov/us/en/transfer-tax-exemptions-under-revenue-and-taxation-code.html).

Sources were checked on 2026-11-09. The manual cover is dated January 2026, while internal pages retain earlier dates. Direct Legislature section pages were inaccessible in this research session; current statutory text and county practice still require domain confirmation. No statutory conclusion is auto-applied.

## Decisions required before implementation

1. **Audience and authority.** Are we preparing an official county tax deed for an authorized county workflow, a purchaser's downstream conveyance, or something else? A purchaser cannot be silently treated as the issuing tax collector. Decide which workflow the product actually offers.
2. **Supported sale path.** Decide whether Chapter 7, Chapter 8 or both are supported. Have the domain reviewer specify the facts, objections, conditions and recitals required for each. Do not derive the chapter or lawful completion from names, county or a successful API key.
3. **Party and vesting contract.** Define the seller/official identity separately from the purchaser and any last assessee. Decide which supplied fields have a place on the instrument and which must be refused with a precise reason. Do not keep requiring vesting merely because ordinary grant deeds do.
4. **Tax instructions.** Approve how explicit taxable/exempt instructions are represented, confirmed and rendered. Coordinate with P03's matrix. Never infer an exemption from the `tax_deed` slug, and never silently drop a contradictory declaration.
5. **Execution and assertions.** Decide which dates are facts to be supplied, which statements are the authorized preparer's instructions, and which fields belong to the county official/notary's physical act and stay blank. Record who instructed a recital and when; DeedPro does not certify sale compliance, expiration of redemption or actual execution.
6. **Compatibility and existing artifacts.** Approve publication/withdrawal of this capability, caller transition and treatment of existing tax-deed drafts. Do not regenerate or alter completed PDF bytes, rewrite historical hashes, send notices or scan production records without the applicable owner approval.

## Proposed engineering sequence

**TDX0 Containment approved and integrated.** The [containment contract](TAX_DEED_CONTAINMENT.md) and merged review 303 refuse new tax-deed creation and pending approval, publish one availability policy across API/application surfaces, and preserve stored bytes. A narrow owner-approved packaging exception admits only the shared policy JSON to Vercel. P02 is rebased onto this actual main commit. This phase is complete; it does not approve the legal/form restoration below.

**TDX1 Approved contract.** Write the instrument-specific request/availability rules in one shared source. Decide whether typed tax-sale facts extend the current API or require a separately versioned contract. Publish a field-to-rendered-text map and explicit refusals for unsupported inputs. Preserve the generic grant-deed contract for other instruments.

**TDX2 Shared mapping and renderer.** Carry approved facts through request, stored evidence and the shared PDF context. Replace or refuse fixed assertions only as the approved model directs. Use the same semantics for the application and API, without duplicate legal-policy engines. Keep physical execution and notary contents blank where doctrine requires them.

**TDX3 Verification and release review before restoration.** Add legal-review-approved fixtures for every supported sale path, taxable/exempt cases, unsupported/contradictory inputs and missing facts. Assert actual PDF text, sale dates, identities, amounts and retained instructions—not merely a PDF header. Prove invalid requests leave no new artifact. Mutation-probe each refusal. Run both suites, all five proofs, unchanged route/six-flow/API baselines unless an intentional change is approved, production build and policy gates. This is the future gate for lifting the hold. P02's separately approved eight-type completion does not wait for or certify nine-type restoration.

## Affected surfaces and limits

The public API and saved application documents share `services/deed_pdf.py` and this tax template. There is also an older direct generator in `backend/routers/deeds_extra.py:55`, mounted only when `ENABLE_DEED_TYPES_EXTRA` is enabled, with a frontend proxy at `frontend/src/app/api/generate/tax-deed-ca/route.ts:9`. Its `TaxDeedContext` only adds the sale reference to a generic optional-field model (`backend/models/tax_deed.py:35`). The repository flag default is false; production flag state was not inspected. Do not assume disabling one public route repairs every rendering path.

Production usage, affected real documents, active integrations and recording outcomes are unknown. No production query, historical correction, manual deployment, hosting-setting change, customer message or legal choice was performed. Existing provider hooks can react to approved main merges. P02 integration and full launch clearance remain separate from restoring this instrument.

## Provisional effort for ranking

| Work | Focused engineering hours |
|---|---|
| Optional containment and consistent availability | 6–10 |
| Contract and field/recital design after domain decisions | 6–10 |
| Validation, shared mapping and persistence/evidence changes | 16–24 |
| Approved renderer changes and PDF-text checks | 10–16 |
| Compatibility docs, cross-surface checks and full gates | 8–12 |
| Total including optional containment | 46–72 |

This original planning range includes TDX0, which has since been approved and integrated; it is not a fresh estimate of remaining work, a restoration authorization or a fixed quote. It excludes counsel/owner review time, production inventory, historical remediation, customer coordination and waiting for county-specific requirements. Choosing a narrower supported sale path may reduce the remaining build; permanent deferral of this instrument is a product decision, not an engineering failure.
