# V0 Prompt — Step Card (Style Only)

Update the step container visuals:
- Title (bold 700), optional subtitle (muted)
- Card surface: white, subtle border, radius 16px, tiny shadow
- Responsive spacing (16/24px)

No logic changes. Return a React component `<WizardStepCardV0>` that accepts:
```ts
{ title: string; subtitle?: string; rightAccessory?: React.ReactNode; children: React.ReactNode }
```
