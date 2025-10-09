# Wizard‑First Guardrails

- Treat the Grant Deed wizard and templates as **read‑only** unless a task explicitly requires changes.
- No AI in the PDF generation path; all documents use Pydantic → Jinja → WeasyPrint.
- Prefer adding new modules/files over editing existing ones. If a conflict arises, mount new routes/components.
- Replace any mock dashboard/shared‑deeds data with **real** API calls.
