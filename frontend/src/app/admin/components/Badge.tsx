type BadgeProps = { kind:'success'|'warn'|'danger'|'neutral'; children: React.ReactNode }
export default function Badge({ kind, children }: BadgeProps){
  return <span className={`badge ${kind}`}>{children}</span>;
}

