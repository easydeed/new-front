# Wizard‑First Rules (for Cursor)

- Treat the Grant Deed wizard, its validation, and its PDF templates as **read‑only** unless a task explicitly requires changes.
- Never introduce LLM calls into generation endpoints. All document generation must remain deterministic.
- If a router path conflict arises, prefer mounting **new** router modules rather than editing the existing grant‑deed router.
- For dashboard/admin changes, **call backend APIs** instead of creating mock data.
