# V0 Prompts (copy/paste into https://v0.dev)

- Auth (4): login, register, forgot-password, reset-password
- Dashboard (1)
- Wizard UI components (6): property-search, parties, vesting, legal-description, progress-indicator, smart-review

Guidelines for every prompt:
- **Preserve logic** (AuthManager, API calls, query params, localStorage).
- **Do not** introduce global CSS; keep Tailwind v3 classes.
- **No external fonts**; use system UI stack.
- **No color hard-coding unless asked**; let V0 propose a cohesive light theme.
- **Accessibility**: labels, focus states, keyboard nav.
