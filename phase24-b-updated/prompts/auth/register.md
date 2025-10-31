# V0 Prompt – Auth › Registration (11 fields, UI Refresh, Logic Preserved)

**Keep exactly**:
- Field list and names (snake_case payload): email, password, confirm_password, full_name, role, company_name, company_type, phone, state, agree_terms, subscribe
- Validation rules (email format, pw length, match, role/state selected, terms checked)
- Redirect to `/login?registered=true&email=...`
- API path: `POST /users/register`

**Task**: Improve layout, spacing, labels, helper text, inline errors, progress indicator if multi‑step.  
System fonts, Tailwind v3 utilities only.

**Deliver**: `page.tsx` visually upgraded, logic preserved.
