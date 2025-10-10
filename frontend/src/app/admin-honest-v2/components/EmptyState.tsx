type EmptyStateProps = { icon?: string; title: string; description?: string }
export default function EmptyState({ icon='📭', title, description }: EmptyStateProps){
  return (
    <div className="card" style={{textAlign:'center', padding:48, opacity:.8}}>
      <div style={{fontSize:48, marginBottom:12}}>{icon}</div>
      <div style={{fontWeight:600, fontSize:16, marginBottom:4}}>{title}</div>
      {description && <div style={{opacity:.7, fontSize:13}}>{description}</div>}
    </div>
  );
}

