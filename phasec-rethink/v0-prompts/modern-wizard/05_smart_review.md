# V0 Prompt — SmartReview (Style Only)

Visual refresh of the summary screen. Keep the data map & edit links.
- Title + list of labeled rows (label left, value right)
- Confirm button aligned right

Return `<SmartReviewV0>` with:
```ts
{ title?: string; rows: Array<{label:string; value:ReactNode; editHref?:string}>; onConfirm?: () => void; confirmLabel?: string }
```
