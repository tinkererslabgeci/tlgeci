import { useEffect, useRef, useState } from 'react'

const TITLE = 'TINKERERS\' LAB'

const QUOTES = [
  { text: 'Build first. Learn faster.' },
  { text: 'Curiosity → circuits → creations.' },
  { text: 'Prototype. Break. Improve. Repeat.' },
]

const HAPPENINGS = [
  {
    title: 'Workshops',
    description: 'Workshops at the Tinkerers’ Lab are designed to give students practical exposure to electronics and innovation. Through guided sessions, participants learn to work with tools, components, and systems while developing problem-solving skills and creative thinking..',
    img: '/activities/activity-workshop.svg',
    alt: 'Workshop activity',
  },
  {
    title: 'Project builds',
    description: 'Student-led projects where ideas are designed, built, tested, and refined through collaboration, encouraging innovation and problem-solving.',
    img: '/activities/activity-build.svg',
    alt: 'Students building projects',
  },
  {
    title: 'Open build hours',
    description: 'Drop in, pick a problem, and build with peer support in a student-managed space.Flexible lab hours to explore ideas, work on personal or group projects, and build solutions with peer support in a student-driven environment.',
    img: '/equipment/machine-electronics.svg',
    alt: 'Electronics equipment and prototyping',
  },
]

const SNAPSHOTS = [
  { src: '/gallery/lab-1.svg', alt: 'Tinkerers Lab snapshot 1' },
  { src: '/gallery/lab-2.svg', alt: 'Tinkerers Lab snapshot 2' },
  { src: '/gallery/lab-3.svg', alt: 'Tinkerers Lab snapshot 3' },
]

export default function HomePage() {
  const [quoteIndex, setQuoteIndex] = useState(2)
  const [quoteFading, setQuoteFading] = useState(false)
  const aboutRef = useRef(null)
  const [aboutVisible, setAboutVisible] = useState(false)
  const [stageRevealed, setStageRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStageRevealed(true), 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    // Quote rotation interval (ms). Change this value to control how fast quotes cycle.
    const cycleMs = prefersReduced ? 6500 : 6500
    const fadeMs = prefersReduced ? 0 : 260

    const interval = setInterval(() => {
      if (fadeMs > 0) {
        setQuoteFading(true)
        setTimeout(() => {
          setQuoteIndex((i) => (i + 1) % QUOTES.length)
          setQuoteFading(false)
        }, fadeMs)
      } else {
        setQuoteIndex((i) => (i + 1) % QUOTES.length)
      }
    }, cycleMs)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const el = aboutRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setAboutVisible(true)
      },
      { threshold: 0.12 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="intro" aria-label="Tinkerers Lab home">
      <div className={`introStage ${stageRevealed ? 'isRevealed' : ''}`.trim()}>
        <div className="introGlow introGlowA" />
        <div className="introGlow introGlowB" />
        <div className="introGlow introGlowC" />

        <Circuit className="introCircuit introCircuitA" />
        <Circuit className="introCircuit introCircuitB" />

        <FloatingIcon className="introIcon introIconTool" delay={0.15} label="Tools">
          <ToolIcon />
        </FloatingIcon>

        <FloatingIcon className="introIcon introIconRobot" delay={0.35} label="Robot">
          <RobotIcon />
        </FloatingIcon>

        <FloatingIcon className="introIcon introIconBulb" delay={0.55} label="Innovation">
          <BulbIcon />
        </FloatingIcon>

        <FloatingIcon className="introIcon introIconChip" delay={0.75} label="Circuits">
          <ChipIcon />
        </FloatingIcon>

        <div className="introCube introCubeA" aria-hidden="true" />
        <div className="introCube introCubeB" aria-hidden="true" />

        <div className="introContent" aria-hidden="false">
          <div className="introQuotes" aria-label="Intro quote">
            <blockquote className="introQuote">
              <p
                className="introQuoteText"
                style={{
                  opacity: quoteFading ? 0 : 0.68,
                  transform: quoteFading ? 'translateY(6px)' : 'translateY(0)',
                  transition: 'opacity 260ms ease, transform 260ms ease',
                }}
              >
                “{QUOTES[quoteIndex].text}”
              </p>
            </blockquote>
          </div>

          <h1 className="introTitle" aria-label={TITLE}>
            {Array.from(TITLE).map((ch, idx) => (
              <span
                key={`${ch}-${idx}`}
                className={ch === ' ' ? 'introTitleSpace' : 'introTitleChar'}
                style={{ '--d': `${idx * 0.045}s` }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))}
          </h1>
        </div>
      </div>

      <div id="about" ref={aboutRef} className={`introBelow ${aboutVisible ? 'isVisible' : ''}`}>
        <div className="container">
          <div className="sectionStack">
            <section className="card toneA mediaLoad" style={{ padding: '1.4rem', '--i': 0 }}>
              <h2 className="sectionH2" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                Tinkerers' Lab - GECI
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.80)', marginTop: 0, lineHeight: 1.6 }}>
                Tinkerers' Lab GECI is a student operating makerspace that helps you create,innovate,increment and refine,transforming ideas into reality through hands-on experimenting,team work and learning.
              </p>
              <p>need content !</p>
             
              <div style={{ minHeight: '2rem' }}></div>

              <div className="grid cols-2" style={{ marginTop: '1.1rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                  <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    What you’ll do
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'rgba(255, 255, 255, 0.80)', lineHeight: 1.7 }}>
                    <li>Attend workshops and build sessions</li>
                    <li>Work on projects and prototypes</li>
                    <li>Learn with mentors and peers (student-run culture)</li>
                  </ul>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    Who it’s for
                  </h3>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.80)', lineHeight: 1.6 }}>
                    Beginners to advanced,anyone curious. If you want to build something real, this is your place.
                  </p>
                </div>
              </div>
            </section>

            <section className="card toneB" style={{ padding: '1.4rem' }}>
              <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.8 rem' }}>
                What’s happening in TL GECI
              </h3>
              <div className="grid cols-3" style={{ marginTop: '0.75rem' }}>
                {HAPPENINGS.map((h, idx) => (
                  <div
                    key={h.title}
                    className="card mediaCard mediaLoad"
                    style={{ overflow: 'hidden', '--i': idx }}
                  >
                    <img
                      className="mediaImg"
                      src={h.img}
                      alt={h.alt}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        display: 'block',
                        borderBottom: '1px solid rgba(255,255,255,0.10)',
                      }}
                    />
                    <div style={{ padding: '0.9rem' }}>
                      <div style={{ fontWeight: 750 }}>{h.title}</div>
                      <p style={{ margin: '0.45rem 0 0', color: 'rgba(255, 255, 255, 0.78)', lineHeight: 1.8 }}>
                        {h.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="card toneC" style={{ padding: '1.4rem' }}>
              <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
                Equipment & tools
              </h3>

              <div className="grid cols-3" style={{ marginTop: '0.75rem' }}>
                {[{ src: '/equipment/machine-laser-cutter.svg', label: 'Laser cutter' }, { src: '/equipment/machine-3d-printer.svg', label: '3D printer' }, { src: '/equipment/machine-vinyl-cutter.svg', label: 'Vinyl cutter' }].map(
                  (m, idx) => (
                    <div
                      key={m.label}
                      className="card mediaCard mediaLoad"
                      style={{ overflow: 'hidden', '--i': idx }}
                    >
                      <img
                        className="mediaImg"
                        src={m.src}
                        alt={m.label}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: 150,
                          objectFit: 'cover',
                          display: 'block',
                          borderBottom: '1px solid rgba(255,255,255,0.10)',
                        }}
                      />
                      <div style={{ padding: '0.75rem 0.9rem', fontWeight: 750 }}>{m.label}</div>
                    </div>
                  )
                )}
              </div>

              <div className="grid cols-2" style={{ marginTop: '1rem', alignItems: 'start' }}>
                <div className="card mediaCard mediaLoad" style={{ overflow: 'hidden', '--i': 0 }}>
                  <img
                    className="mediaImg"
                    src="/equipment/machine-power-tools.svg"
                    alt="Power tools"
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 170,
                      objectFit: 'cover',
                      display: 'block',
                      borderBottom: '1px solid rgba(255,255,255,0.10)',
                    }}
                  />
                  <div style={{ padding: '0.75rem 0.9rem', fontWeight: 750 }}>Power tools</div>
                </div>

                <div className="card mediaCard mediaLoad" style={{ overflow: 'hidden', '--i': 1 }}>
                  <img
                    className="mediaImg"
                    src="/equipment/machine-electronics.svg"
                    alt="Electronic equipments"
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 170,
                      objectFit: 'cover',
                      display: 'block',
                      borderBottom: '1px solid rgba(255,255,255,0.10)',
                    }}
                  />
                  <div style={{ padding: '0.75rem 0.9rem', fontWeight: 750 }}>Electronic equipments</div>
                </div>
              </div>

            </section>

            <section className="card toneD" style={{ padding: '1.4rem' }}>
              <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                Lab snapshots
              </h3>
              <div className="grid cols-3" style={{ marginTop: '0.75rem' }}>
                {SNAPSHOTS.map((s, idx) => (
                  <div
                    key={s.alt}
                    className="card mediaCard mediaLoad"
                    style={{ overflow: 'hidden', '--i': idx }}
                  >
                    <img
                      className="mediaImg"
                      src={s.src}
                      alt={s.alt}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 170,
                        objectFit: 'cover',
                        display: 'block',
                        borderBottom: '1px solid rgba(255,255,255,0.10)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <p style={{ margin: '0.75rem 0 0', color: 'rgba(255, 255, 255, 0.70)', lineHeight: 1.6 }}>
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}

function FloatingIcon({ children, className, delay, label }) {
  return (
    <div className={className} style={{ '--popDelay': `${delay}s` }} aria-hidden="true" title={label}>
      {children}
    </div>
  )
}

function Circuit({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 110h120l26-38h92l30 60h90l40-55h84l30 33h68"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength="1"
      />
      <circle cx="18" cy="110" r="6" fill="currentColor" />
      <circle cx="164" cy="72" r="6" fill="currentColor" />
      <circle cx="286" cy="132" r="6" fill="currentColor" />
      <circle cx="416" cy="77" r="6" fill="currentColor" />
      <circle cx="532" cy="110" r="6" fill="currentColor" />
    </svg>
  )
}

function ToolIcon() {
  return (
    <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
      <defs>
        <linearGradient id="gTool" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255, 255, 255, 0.92)" />
          <stop offset="1" stopColor="rgba(255, 255, 255, 0.70)" />
        </linearGradient>
      </defs>
      <path
        d="M42.8 12.3c-3.6 1.3-6.4 4.3-7.3 8.1-.3 1.2-.3 2.5 0 3.7L19.3 40.3l-4.5-.9-3.9 3.9 9.7 9.7 3.9-3.9-.9-4.5 16.2-16.2c1.2.3 2.5.3 3.7 0 3.8-.9 6.8-3.7 8.1-7.3l-6.5 1.7-5.2-5.2 1.9-6.3Z"
        fill="url(#gTool)"
        opacity="0.95"
      />
    </svg>
  )
}

function RobotIcon() {
  return (
    <svg viewBox="0 0 64 64" width="58" height="58" aria-hidden="true">
      <defs>
        <linearGradient id="gRobot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255, 255, 255, 0.90)" />
          <stop offset="1" stopColor="rgba(255, 255, 255, 0.62)" />
        </linearGradient>
      </defs>
      <path
        d="M28 10a4 4 0 0 1 8 0v4h4a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10H24A10 10 0 0 1 14 42V24a10 10 0 0 1 10-10h4v-4Z"
        fill="url(#gRobot)"
        opacity="0.95"
      />
      <circle cx="24" cy="30" r="5" fill="rgba(11, 18, 32, 0.85)" />
      <circle cx="40" cy="30" r="5" fill="rgba(11, 18, 32, 0.85)" />
      <path
        d="M22 42c3.2 2.7 6.5 4 10 4s6.8-1.3 10-4"
        stroke="rgba(11, 18, 32, 0.85)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M32 14V7"
        stroke="rgba(255, 255, 255, 0.55)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="32" cy="6" r="3" fill="rgba(255, 255, 255, 0.50)" />
    </svg>
  )
}

function BulbIcon() {
  return (
    <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
      <defs>
        <linearGradient id="gBulb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255, 255, 255, 0.90)" />
          <stop offset="1" stopColor="rgba(255, 255, 255, 0.66)" />
        </linearGradient>
      </defs>
      <path
        d="M32 6c-10.5 0-19 8.1-19 18.2 0 6.4 3.4 11.8 8.4 15.1 2.1 1.4 3.6 3.5 4.1 6h12.9c.5-2.5 2-4.6 4.1-6 5.1-3.3 8.5-8.7 8.5-15.1C51 14.1 42.5 6 32 6Z"
        fill="url(#gBulb)"
        opacity="0.95"
      />
      <path d="M24 52h16" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 58h12" stroke="rgba(255, 255, 255, 0.40)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function ChipIcon() {
  return (
    <svg viewBox="0 0 64 64" width="54" height="54" aria-hidden="true">
      <defs>
        <linearGradient id="gChip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255, 255, 255, 0.88)" />
          <stop offset="1" stopColor="rgba(255, 255, 255, 0.62)" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="32" height="32" rx="8" fill="url(#gChip)" opacity="0.95" />
      <rect x="24" y="24" width="16" height="16" rx="4" fill="rgba(11, 18, 32, 0.70)" />
      {Array.from({ length: 6 }).map((_, i) => (
        <path
          key={i}
          d={`M${10 + i * 7} 12v6M${10 + i * 7} 46v6`}
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
