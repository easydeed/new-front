export function IntegrationCard({name, badge, blurb}:{name:string; badge?:string; blurb:string}){
  return (
    <article className="card">
      <header className="flex items-center justify-between">
        <h3 className="font-heading text-ink">{name}</h3>
        {badge && <span className="text-xs text-slate">{badge}</span>}
      </header>
      <p className="mt-2 text-sm text-slate">{blurb}</p>
      <button className="mt-3 text-sm text-teal underline">Connect</button>
    </article>
  )
}

