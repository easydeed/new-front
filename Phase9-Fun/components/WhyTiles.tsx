const tiles = [
  { title: 'Zero Re‑Keying', text: 'Import from SoftPro/Qualia; we map fields for you.' },
  { title: 'Always Recorder‑Compliant', text: 'Margins, Exhibit A logic, notary block—done.' },
  { title: 'Audit‑Ready', text: 'Request IDs, full history, SOC 2 / ALTA aligned.' }
];

export default function WhyTiles(){
  return (
    <section className="section">
      <div className="mx-auto max-w-6xl px-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(t => (
          <article key={t.title} className="card">
            <h3 className="font-heading text-ink">{t.title}</h3>
            <p className="mt-2 text-sm text-slate">{t.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
