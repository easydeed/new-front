repo: easydeed/new-front
branch: main

## Last sync

date: 2026-09-21T19:26:41Z

### Updated in this project

- Designed `/try` — the three-act live API demonstration — against the shipped v1 contract.
- Recreated the marketing shell (StickyNav lockup, homepage dark platform-card patterns) and the `/confirm/[token]` surface inside the demo.
- Corrected the brief's `DRAFT_SUPERSEDED` to the shipped `DRAFT_MISMATCH`.
- Wrote a build-requirements list of every capability the design assumes and the API does not have.

## Screen map

| Project screen | Built from |
|---|---|
| Try Prototype.dc.html — nav + shell | frontend/src/components/landing-v2/StickyNav.tsx, frontend/src/components/brand/Logo.tsx, docs/BRAND.md, frontend/src/app/globals.css |
| Try Prototype.dc.html — Act 1 console & traps | backend/services/api_catalog.py, backend/schemas/api_v1/deeds.py, backend/tests/test_api_v1_error_contract.py, frontend/src/lib/apiDocs.ts, frontend/src/app/page.tsx |
| Try Prototype.dc.html — Act 2 phone | frontend/src/app/confirm/[token]/page.tsx, backend/services/api_confirm.py, backend/routers/api_confirm.py |
| Try Prototype.dc.html — Act 3 artifact & tamper | backend/services/api_confirm.py (ARTIFACT_KEYS, ARTIFACT_DECLARATIONS), backend/routers/api_confirm.py (approve_confirmation) |
| Try Prototype.dc.html — close / request access | frontend/src/app/developers/ApiInquiryForm.tsx, frontend/src/app/developers/page.tsx |
| Try Edge States.dc.html | backend/routers/api_confirm.py (_throttle, resolve_state), backend/services/api_confirm.py, frontend/src/app/trust/page.tsx |
| Build Requirements.dc.html | all of the above, plus docs/BRAND.md |
