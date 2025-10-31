# Testing Checklist (Phase 24‑B)

## Auth
- [ ] Login: success redirect to dashboard
- [ ] Login: invalid creds show inline error
- [ ] Register: 11 validations (email, password match, state, role, terms)
- [ ] Forgot: success info for existing email, error on 404
- [ ] Reset: token param required, success → redirect to login

## Dashboard
- [ ] Redirect unauthenticated to `/login?redirect=/dashboard`
- [ ] `/users/profile` check runs once and handles 401 by logout→/login
- [ ] `/deeds/summary` renders 4 metrics
- [ ] `/deeds` renders last 5 deeds (or empty state)
- [ ] Draft banner shows only with `localStorage['deedWizardDraft']`
- [ ] CTA buttons route correctly

## Wizard (UI‑only)
- [ ] Property address search still hydrates SiteX data
- [ ] Parties, Vesting, Legal Description components keep all handlers
- [ ] SmartReview renders all data; PDF still generates
