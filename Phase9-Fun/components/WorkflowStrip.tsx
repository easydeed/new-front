const steps = [
  { title: 'Import Order', text: 'Pull parties, vesting, APN, legal where available.' },
  { title: 'Review & Signers', text: 'Keyboard‑fast wizard; compact forms.' },
  { title: 'Recorder‑Ready PDF', text: 'Margins and notary block applied.' }
];

export default function WorkflowStrip(){
  return (
    <section className="section bg-white">
      <div className="mx-auto max-w-6xl px-4 grid gap-4 sm:grid-cols-3">
        {steps.map(s => (
          <div key={s.title} className="rounded-md ring-1 ring-slate/15 p-4">
            <div className="font-heading text-ink">{s.title}</div>
            <div className="mt-1 text-sm text-slate">{s.text}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
