import { FaEnvelope, FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa'
import { leadership, teams, profilePlaceholderImage } from '../data/execomData.js'

const profilePlaceholder = profilePlaceholderImage

function contactHref(type, raw) {
  const v = String(raw || '').trim()
  if (!v) return ''

  if (type === 'whatsapp') return `https://wa.me/${v.replace(/\D+/g, '')}`
  if (type === 'email') return `mailto:${v}`
  if (type === 'instagram') {
    if (/^https?:\/\//i.test(v)) return v
    return `https://instagram.com/${v.replace(/^@/, '')}`
  }
  if (type === 'linkedin') {
    if (/^https?:\/\//i.test(v)) return v
    return `https://linkedin.com/in/${v.replace(/^@/, '')}`
  }
  return ''
}

function ContactIcon({ type, value, icon, label }) {
  const href = contactHref(type, value)
  if (!href) {
    return (
      <span
        aria-label={`${label} not available`}
        title={`${label} not available`}
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          color: 'var(--muted)',
          cursor: 'not-allowed',
        }}
      >
        {icon}
      </span>
    )
  }

  return (
    <a
      href={href}
      target={type === 'email' ? undefined : '_blank'}
      rel="noreferrer"
      aria-label={label}
      title={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--border)',
        background: 'var(--panel)',
        color: 'var(--text)',
        textDecoration: 'none',
      }}
    >
      {icon}
    </a>
  )
}

function MemberCard({ member, index = 0 }) {
  return (
    <div className="card execomCard" style={{ padding: '1rem', '--i': index }}>
      <div className="execomPhotoWrap">
        <img
          src={member.photo || profilePlaceholder}
          alt={member.name}
          loading="lazy"
          className="execomPhoto"
        />
      </div>
      <div style={{ marginTop: '0.75rem', fontWeight: 700 }}>{member.name}</div>
      <div style={{ marginTop: '0.2rem', color: 'var(--muted)' }}>{member.role}</div>
      {member.department ? (
        <div style={{ marginTop: '0.2rem', color: 'var(--muted)', fontSize: '0.9rem' }}>{member.department}</div>
      ) : null}
      <div style={{ marginTop: '0.7rem', display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <ContactIcon type="whatsapp" value={member.phone} icon={<FaWhatsapp />} label={`WhatsApp ${member.name}`} />
        <ContactIcon type="instagram" value={member.instagram} icon={<FaInstagram />} label={`Instagram ${member.name}`} />
        <ContactIcon type="linkedin" value={member.linkedin} icon={<FaLinkedinIn />} label={`LinkedIn ${member.name}`} />
        <ContactIcon type="email" value={member.email} icon={<FaEnvelope />} label={`Email ${member.name}`} />
      </div>
    </div>
  )
}

export default function TeamPage() {
  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Execom Team</h1>
        <p className="pageSubtitle">Faculty in charge, core leadership, and team structure of TL GECI with member contact details.</p>
      </header>

      <section className="card" style={{ padding: '1.4rem' }}>
        <h2 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
          Core Leadership
        </h2>
        <div className="grid cols-3">
          {leadership.map((member, idx) => (
            <MemberCard key={member.name} member={member} index={idx} />
          ))}
        </div>
      </section>

      {teams.map((team) => (
        <section key={team.key} className="card" style={{ padding: '1.4rem' }}>
          <h2 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
            {team.title}
          </h2>
          <div className="grid cols-3">
            {team.members.map((member, idx) => (
              <MemberCard key={`${team.key}-${member.name}`} member={member} index={idx} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
