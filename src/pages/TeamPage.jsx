import profilePlaceholder from '../assets/gallery/lab-1.svg'
import { FaEnvelope, FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa'

const leadership = [
  {
    name: 'Dr. Reena Nair',
    role: 'Faculty in Charge (PIC)',
    department: 'Dept. of Computer Science and Engineering',
    phone: '',
    instagram: '',
    linkedin: '',
    email: '',
    photo: profilePlaceholder,
  },
  {
    name: 'Prof. Ratheesh T K',
    role: 'Faculty in Charge (PIC)',
    department: 'Dept. of Information Technology',
    phone: '',
    instagram: '',
    linkedin: '',
    email: '',
    photo: profilePlaceholder,
  },
  {
    name: 'Mr. Pratheesh S',
    role: 'Lab Champion',
    department: '',
    phone: '',
    instagram: '',
    linkedin: '',
    email: '',
    photo: profilePlaceholder,
  },
  {
    name: 'Pranay K Pradeep',
    role: 'Lab Manager 1',
    department: '',
    phone: '8078479399',
    instagram: '',
    linkedin: '',
    email: 'pranaykpradeep05@gmail.com',
    photo: profilePlaceholder,
  },
  {
    name: 'Renvin C J',
    role: 'Lab Manager 2',
    department: '',
    phone: '8921661311',
    instagram: '',
    linkedin: '',
    email: 'cjrenvin@gmail.com',
    photo: profilePlaceholder,
  },
]

const teams = [
  {
    key: 'event-management',
    title: 'Event Management Team',
    members: [
      { name: 'Ihsaan Mohammed K S', role: 'Head', phone: '9744907092', instagram: '', linkedin: '', email: 'ihsaanmoh8@gmail.com', photo: profilePlaceholder },
      { name: 'Anand P Vinod', role: 'Member', phone: '9747218422', instagram: '', linkedin: '', email: 'anandpvinod887@gmail.com', photo: profilePlaceholder },
      { name: 'Feba Biju', role: 'Member', phone: '883939103', instagram: '', linkedin: '', email: 'bijupanikkadu@gmail.com', photo: profilePlaceholder },
      { name: 'Jestin Joseph', role: 'Member', phone: '7558896441', instagram: '', linkedin: '', email: 'jestinjoseph5088@gmail.com', photo: profilePlaceholder },
    ],
  },
  {
    key: 'finance',
    title: 'Finance Team',
    members: [
      { name: 'Karen Aradh', role: 'Head', phone: '8281232679', instagram: '', linkedin: '', email: 'karenaradh12@gmail.com', photo: profilePlaceholder },
      { name: 'Diya Sara Shyju', role: 'Member', phone: '8891208868', instagram: '', linkedin: '', email: 'saradiya2k24@gmail.com', photo: profilePlaceholder },
      { name: 'Sana Sidhique', role: 'Member', phone: '9895784679', instagram: '', linkedin: '', email: 'sanasidhique01@gmail.com', photo: profilePlaceholder },
      { name: 'Basim Areekatt', role: 'Member', phone: '9074352348', instagram: '', linkedin: '', email: 'basimareekatt@gmail.com', photo: profilePlaceholder },
    ],
  },
  {
    key: 'project-handling',
    title: 'Project Handling Team',
    members: [
      { name: 'Hathim Ali K H', role: 'Head', phone: '8921594639', instagram: '', linkedin: '', email: 'h.ali@tuta.io', photo: profilePlaceholder },
      { name: 'Adithyan V S', role: 'Member', phone: '7356591930', instagram: '', linkedin: '', email: 'adithyanvs107@gmail.com', photo: profilePlaceholder },
      { name: 'Lakshmi B', role: 'Member', phone: '9446845106', instagram: '', linkedin: '', email: 'blakshmi5106@gmail.com', photo: profilePlaceholder },
      { name: 'Harekrishna K G', role: 'Member', phone: '7902599369', instagram: '', linkedin: '', email: 'hkkg0987@gmail.com', photo: profilePlaceholder },
    ],
  },
  {
    key: 'outreach',
    title: 'Outreach Team',
    members: [
      { name: 'Adithyan P L.', role: 'Head', phone: '7510522251', instagram: '', linkedin: '', email: 'adhizdc@gmail.com', photo: profilePlaceholder },
      { name: 'Amarnath Siva', role: 'Member', phone: '7012877989', instagram: '', linkedin: '', email: 'amarnadh4you@gmail.com', photo: profilePlaceholder },
      { name: 'Athul Krishnan T.', role: 'Member', phone: '8848765532', instagram: '', linkedin: '', email: 'athulkrishnant22@gmail.com', photo: profilePlaceholder },
      { name: 'Archana Gopi', role: 'Member', phone: '9188221897', instagram: '', linkedin: '', email: 'archanagopiv@gmail.com', photo: profilePlaceholder },
    ],
  },
  {
    key: 'public-relations',
    title: 'Public Relations Team',
    members: [
      { name: 'Alan Anto', role: 'Head', phone: '8129368816', instagram: '', linkedin: '', email: 'alananto132004@gmail.com', photo: profilePlaceholder },
      { name: 'Sneha S Nair', role: 'Member', phone: '8921715842', instagram: '', linkedin: '', email: 'snehasnair047@gmail.com', photo: profilePlaceholder },
      { name: 'Aravind S Bhaskar', role: 'Member', phone: '95446862297', instagram: '', linkedin: '', email: 'aravindsb456@gmail.com', photo: profilePlaceholder },
      { name: 'Nishba K', role: 'Member', phone: '8075553561', instagram: '', linkedin: '', email: 'nishba3561@gmail.com', photo: profilePlaceholder },
      { name: 'Anjoom Dariya A S', role: 'Member', phone: '8590875966', instagram: '', linkedin: '', email: 'anjoomdariya@gmail.com', photo: profilePlaceholder },
      { name: 'Shivani P V', role: 'Member', phone: '9446080409', instagram: '', linkedin: '', email: 'ponnushiva7@gmail.com', photo: profilePlaceholder },
    ],
  },
]

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
          border: '1px solid rgba(255, 255, 255, 0.10)',
          background: 'rgba(255, 255, 255, 0.03)',
          color: 'rgba(255, 255, 255, 0.40)',
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
        border: '1px solid rgba(255, 255, 255, 0.16)',
        background: 'rgba(255, 255, 255, 0.06)',
        color: 'rgba(255, 255, 255, 0.92)',
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
      <div style={{ marginTop: '0.2rem', color: 'rgba(255, 255, 255, 0.72)' }}>{member.role}</div>
      {member.department ? (
        <div style={{ marginTop: '0.2rem', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.9rem' }}>{member.department}</div>
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
