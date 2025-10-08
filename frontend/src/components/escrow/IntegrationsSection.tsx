import { IntegrationCard } from './IntegrationCard'

export default function IntegrationsSection(){
  return (
    <section className="section">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-heading text-ink text-2xl">Integrations Marketplace</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <IntegrationCard name="SoftPro 360" badge="Workflow" blurb="Auto‑generate deeds from Process Automation—no re‑keying." />
          <IntegrationCard name="Qualia GraphQL Sync" badge="Sync" blurb="Bidirectional order sync; no duplicate entry." />
        </div>
      </div>
    </section>
  )
}

