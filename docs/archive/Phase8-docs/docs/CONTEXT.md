# Context (Why this kit exists)

This kit operationalizes our plan to add more deed types **without touching the crown‑jewel Grant Deed wizard**.
It follows the "wizard‑first" integration guidance and the Phase 6‑1 system analysis:

- **Adding New Deed Types recap** — step-by-step roles across FE/BE/templates.  
- **Phase 6‑1 System Analysis** — most non‑wizard surfaces are disconnected shells; fix integration and keep the wizard deterministic.  
- **Phase 6 plan docs** — make everything orbit the wizard and surface *live* wizard data in dashboard/admin.  
- **Backend route reference** — authoritative map of mounted routers and expectations.  
- **PDF Generation System** — our deterministic stack: Pydantic → Jinja → WeasyPrint.  
- **Pixel-perfect research** — methodology we used for Grant Deed HTML parity; re‑usable for other types if needed.

This kit adds **Quitclaim**, **Interspousal Transfer**, **Warranty**, and **Tax Deeds** end‑to‑end using the same deterministic pipeline,
and ships a Cursor playbook so changes are executed safely and repeatably.
