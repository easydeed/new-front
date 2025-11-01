# Wizard Test Matrix (Modern + Classic)

| Area | Test | Expect |
|---|---|---|
| Address | Enter valid address; select suggestion | SiteX hydrate APN, county, legal description, current owner |
| Address | Invalid address | Clear error; cannot continue |
| Draft | Save mid‑step, refresh | Resume banner, correct step & data |
| Steps | Keyboard‑only navigation | Focus order logical; Enter/Space on buttons |
| Errors | Empty required field | Inline error with ARIA link; cannot continue |
| SmartReview | Edit each section | Returns to section, saves, back to review |
| Finalize | Confirm & generate | Deed created, preview loads, PDF downloads |
| Telemetry | Observe events | StepShown/Completed/Success present for user |
| Mobile | 320/375 px | No overflow; sticky footer CTAs visible |

Run **for all five deed types** (Grant, Quitclaim, Interspousal, Warranty, Tax).
