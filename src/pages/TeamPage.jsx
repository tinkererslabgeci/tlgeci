 const members = [
  { name: 'Name 1', role: 'Coordinator' },
  { name: 'Name 2', role: 'Co-Coordinator' },
  { name: 'Name 3', role: 'Tech Lead' },
  { name: 'Name 4', role: 'Operations' },
  { name: 'Name 5', role: 'Design & Media' },
]

export default function TeamPage() {
  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Team</h1>
        <p className="pageSubtitle">Team details. Replace the placeholders with real names/roles.</p>
      </header>

      <section className="card" style={{ padding: '1.4rem' }}>
        <div className="grid cols-3">
          {members.map((m) => (
            <div key={m.name} className="card" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 700 }}>{m.name}</div>
              <div style={{ marginTop: '0.25rem', color: 'rgba(255, 255, 255, 0.70)' }}>{m.role}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
