export default function DevelopersSection(){
  return (
    <section className="section">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="font-heading text-ink text-2xl">For Integrators & IT</h2>
        <p className="mt-2 text-slate max-w-3xl">Scale with a 99.9% uptime REST API. 50+ endpoints and webhooks.</p>
        <div className="mt-4 flex gap-3">
          <a className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2" href="/api-docs">View API Docs</a>
          <a className="inline-flex items-center gap-2 rounded-md px-4 py-2 ring-1 ring-slate/20 bg-white text-ink hover:bg-slate/10" href="/get-api-key">Get API Key</a>
        </div>
        <pre className="mt-4 p-4 rounded-md bg-white ring-1 ring-slate/15 text-sm text-slate overflow-auto">
curl -X POST https://api.deedpro.com/api/generate/grant-deed-ca \
  -H "Authorization: Bearer &lt;token&gt;" \
  -H "Content-Type: application/json" \
  -d '{ "grantors_text": "JOHN DOE", "grantees_text":"JANE SMITH", "county":"Los Angeles", "legal_description":"LOT 5..." }'
        </pre>
      </div>
    </section>
  )
}
