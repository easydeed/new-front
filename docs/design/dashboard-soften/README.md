# DeedPro dashboard — softened onboarding

Five files. Drop `components/dashboard/*` in as-is; `app-dashboard-page.tsx`
is the composition — rename to `app/dashboard/page.tsx` and wire
`getDashboardData()` to your real data layer.

```
components/dashboard/setup-steps.ts          ← copy + state logic, no JSX
components/dashboard/setup-checklist.tsx     ← the accordion
components/dashboard/deed-header-preview.tsx ← the live-filling right card
components/dashboard/start-something-new.tsx ← teaser → primary, two states
components/dashboard/email-notice.tsx        ← slim replacement for the banner
app-dashboard-page.tsx                       ← → app/dashboard/page.tsx
```

## The color rule

Four jobs, no others. If a fifth use of color appears, one of these stops working.

| Color | Token | Means | Budget |
|---|---|---|---|
| Violet | `--color-brand` `#7C4DFF` | the one thing to do next | **exactly once per screen** |
| Green | `emerald-500/600` | done | done only, never "good" generally |
| Amber | `--color-warning` | a real problem the user must fix | rejected recording, failed signature — *never* an unfilled field |
| Grey | `gray-*` | everything else | most of the page |

The failure mode in the current build is #4 masquerading as #3: "Not set" in
orange, and a full amber banner, both firing before the user has done
anything wrong. Empty ≠ error.

## The accordion invariant

`SetupChecklist` expands exactly one step — the first incomplete one — and it
is the only component on the page allowed a violet button. Completed steps
collapse to one line; later steps render title-only with no body copy and no
button. This is enforced in the component, not by convention: `activeStep()`
derives it from state, so there's no way to render two.

Consequence worth knowing: **the good explanatory copy is not deleted, it's
deferred.** Each step still carries its `why`, it just only renders when it's
that step's turn. Total words on screen drops from ~90 to ~18.

## What changed, and why

1. **One step expanded** — was four, ~90 words of body copy at once.
2. **Progress bar at the top** — "1 of 4 done" was 12px grey at the bottom of
   the card, i.e. the reward was hidden.
3. **One CTA** — was three (finish setup / start a deed / upgrade).
4. **Right card stops repeating the left** — it now shows the deed header
   assembling itself. Same pixels, flips from noise to feedback.
5. **Plan card → one line**, orange "Not set" gone.
6. **"Start something new" demoted** until setup completes, then it becomes
   the primary card once `SetupChecklist` unmounts.

## Notes

- Uses your existing CSS custom properties (`--color-brand`,
  `--color-brand-light`, `--color-brand-hover`) via Tailwind arbitrary values,
  so nothing new lands in `tailwind.config`.
- Class conventions match what's already on the page: `rounded-2xl border
  border-gray-200 bg-white p-5 md:p-6`, `text-lg font-bold text-gray-900`.
- A11y: `role="progressbar"` with live counts, `aria-current="step"` on the
  active row, `sr-only` "done" on completed rows, `motion-reduce` guards on
  both animations.
- `SetupChecklist` returns `null` when setup is complete — it does not linger
  as an all-green trophy card. Reclaim the space.

## One thing to verify before shipping

The company name on the live dashboard reads **"All Good Escow"** — likely a
typo in seed data, but if it came from user input it will print on every
recorded deed. Worth a look either way.
