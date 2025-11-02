# Test Matrix (High‑value checks)

## Auth
- Redirect unauthenticated dashboard → `/login?redirect=/dashboard`
- Login success → dashboard
- Registration → login with success message + email prefill
- Forgot password → success and error states
- Reset password → success + auto‑redirect

## Dashboard
- Stats load from `/deeds/summary`
- Recent deeds load from `/deeds`
- Draft banner shows only when `deedWizardDraft` exists
- Sidebar toggles, links work
- Error & loading states render

## Wizard (both modes)
- SiteX enrichment hydrates legal description, county, APN, owner
- Manual entry path when enrichment fails
- SmartReview shows all answers
- PDF generation succeeds for all 5 deed types
- Draft save/resume works
