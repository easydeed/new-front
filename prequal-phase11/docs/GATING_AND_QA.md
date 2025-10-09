# Gating & QA — Phase 11 Prequal

## Do not proceed to release until ALL are true:
- Preview step title matches the selected deed type.
- Preview shows embedded PDF (not simplified HTML), OR server preview if explicitly opted-in.
- Finalize writes deed metadata to DB and redirects to Past Deeds.
- Past/Shared Deeds and Dashboard show live data (no mocks).
- SiteX/TitlePoint enrichment pre-fills APN, county, owners, and legal description.
- Grant Deed templates and PDF system remain unchanged.

## Rollback
- Revert Step 5 component import to your original `Step5Preview` file.
- Remove `/app/api/deeds/create/route.ts` if undesired.
- Leave backend preview router unmounted (default).
