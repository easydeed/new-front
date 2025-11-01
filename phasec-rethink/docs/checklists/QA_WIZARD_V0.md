# QA Checklist — Modern Wizard V0

- [ ] Authenticated user can reach /create-deed (V0 flag ON)
- [ ] Address search → suggestions → verify (happy path)
- [ ] SiteX fields hydrate: APN, County, Legal Description, Current Owner
- [ ] Grantor/Grantee/Vesting inputs capture values; validation hints display
- [ ] SmartReview shows all fields; Edit links return to correct step
- [ ] Confirm & Generate → backend POST → deed ID returns
- [ ] Preview renders; PDF downloads
- [ ] LocalStorage cleared after finalization
- [ ] Resume draft banner appears only when draft exists
- [ ] Mobile viewport: tap targets ≥ 44px, no horizontal scroll
