import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import anime from 'animejs'
import AnimeGridRipple from '../components/AnimeGridRipple.jsx'

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
        if (entries.some((e) => e.isIntersecting)) {
          setAboutVisible(true)
          // Impressive Anime.js stagger for all cards when scrolled into view
          anime({
            targets: '.animeCard',
            translateY: [60, 0],
            scale: [0.95, 1],
            opacity: [0, 1],
            easing: 'easeOutElastic(1, .8)',
            duration: 1200,
            delay: anime.stagger(120, { start: 200 })
          })
          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="intro" aria-label="Tinkerers Lab home">
      <div className={`introStage ${stageRevealed ? 'isRevealed' : ''}`.trim()}>
        <AnimeGridRipple />
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
            <section className="card toneA animeCard" style={{ padding: '1.4rem', '--i': 0, opacity: 0 }}>
              <h2 className="sectionH2" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                Tinkerers' Lab - GECI
              </h2>
              <p style={{ color: 'var(--text-80)', marginTop: 0, lineHeight: 1.6 }}>
                Tinkerers' Lab GECI is a student operating makerspace that helps you create,innovate,increment and refine,transforming ideas into reality through hands-on experimenting,team work and learning.
              </p>
              <p>The lab provides an open environment where students from all disciplines come together to explore technology, experiment with concepts, and push the boundaries of what’s possible. Whether you’re a beginner taking your first step into electronics or an experienced builder working on advanced prototypes, the lab supports your journey.
              With access to tools, mentorship, and a collaborative community, we encourage a culture of learning by doing—where failure is part of the process and innovation is the goal.</p>
              <p>Equipped with 3D printers, laser cutters, vinyl cutters, and a wide range of electronic tools, our lab empowers you to design, prototype, and build with precision. </p>
             
              <div style={{ minHeight: '2rem' }}></div>

              <div className="grid cols-2" style={{ marginTop: '1.1rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                  <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    What you’ll do
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-80)', lineHeight: 1.7 }}>
                    <li>Attend workshops and build sessions</li>
                    <li>Work on projects and prototypes</li>
                    <li>Learn with mentors and peers (student-run culture)</li>
                  </ul>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                    Who it’s for
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-80)', lineHeight: 1.6 }}>
                    Beginners to advanced,anyone curious. If you want to build something real, this is your place.
                  </p>
                </div>
              </div>
            </section>

            <section className="card toneB animeCard" style={{ padding: '1.4rem', opacity: 0 }}>
              <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.8 rem' }}>
                What’s happening in TL GECI
              </h3>
              <div className="grid cols-3" style={{ marginTop: '0.75rem' }}>
                {HAPPENINGS.map((h, idx) => (
                  <div
                    key={h.title}
                    className="card mediaCard animeCard"
                    style={{ overflow: 'hidden', '--i': idx, opacity: 0 }}
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
                        borderBottom: '1px solid var(--border)',
                      }}
                    />
                    <div style={{ padding: '0.9rem' }}>
                      <div style={{ fontWeight: 750 }}>{h.title}</div>
                      <p style={{ margin: '0.45rem 0 0', color: 'var(--text-78)', lineHeight: 1.8 }}>
                        {h.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="facilitiesCard animeCard" style={{ opacity: 0 }}>
              <div className="facilitiesHeader">
                <h3 className="facilitiesTitle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Our Facilities
                </h3>
                <Link to="/booking" className="facilitiesLink">
                  View all facilities <span>&rarr;</span>
                </Link>
              </div>

              <div className="facilitiesGrid">
                <Link to="/booking" className="facilityItem">
                  <div className="facilityIconWrapper">
                    <Printer3DIcon />
                  </div>
                  <div className="facilityLabel">3D Printing</div>
                </Link>

                <Link to="/booking" className="facilityItem">
                  <div className="facilityIconWrapper">
                    <LaserCutterIcon />
                  </div>
                  <div className="facilityLabel">Laser Cutting</div>
                </Link>

                <Link to="/booking" className="facilityItem">
                  <div className="facilityIconWrapper">
                    <VinylCutterIcon />
                  </div>
                  <div className="facilityLabel">Vinyl Cutting</div>
                </Link>

                <Link to="/booking" className="facilityItem">
                  <div className="facilityIconWrapper">
                    <PowerToolsIcon />
                  </div>
                  <div className="facilityLabel">Power Tools</div>
                </Link>

                <Link to="/booking" className="facilityItem">
                  <div className="facilityIconWrapper">
                    <ElectronicWorkbenchIcon />
                  </div>
                  <div className="facilityLabel">Electronics Workbench</div>
                </Link>
              </div>
            </section>

            <section className="card toneD animeCard" style={{ padding: '1.4rem', opacity: 0 }}>
              <h3 className="sectionH3" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                Lab snapshots
              </h3>
              <div className="grid cols-3" style={{ marginTop: '0.75rem' }}>
                {SNAPSHOTS.map((s, idx) => (
                  <div
                    key={s.alt}
                    className="card mediaCard animeCard"
                    style={{ overflow: 'hidden', '--i': idx, opacity: 0 }}
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
                        borderBottom: '1px solid var(--border)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <p style={{ margin: '0.75rem 0 0', color: 'var(--text-70)', lineHeight: 1.6 }}>
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

function Printer3DIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="print-head">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <line x1="3" y1="12" x2="21" y2="12" strokeWidth="1" strokeDasharray="3 3" />
      <g className="print-head">
        <path d="M10 7v3h4V7h-4z" fill="currentColor" fillOpacity="0.1" />
        <path d="M12 10l-1 2h2l-1-2" fill="currentColor" />
      </g>
      <line x1="5" y1="18" x2="19" y2="18" strokeWidth="1.5" />
      <path d="M9 18l1-4h4l1 4H9z" fill="currentColor" fillOpacity="0.15" strokeWidth="1.5" />
      <line x1="6" y1="7" x2="6" y2="18" strokeWidth="0.8" />
      <line x1="18" y1="7" x2="18" y2="18" strokeWidth="0.8" />
    </svg>
  )
}

function LaserCutterIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="4" y="6" width="16" height="10" rx="1" strokeWidth="1.2" />
      <line x1="4" y1="9" x2="20" y2="9" strokeWidth="1" />
      <rect x="10" y="8" width="4" height="3" rx="0.5" fill="currentColor" fillOpacity="0.15" />
      <line x1="12" y1="11" x2="12" y2="14" strokeWidth="1.5" strokeDasharray="2 2" className="laser-beam" style={{ color: 'var(--link)' }} />
      <circle cx="12" cy="14" r="1" fill="currentColor" className="laser-beam" />
      <path d="M8 14.5l2-1h4l2 1" strokeWidth="1.2" />
      <path d="M7 16h10" strokeWidth="1.5" />
    </svg>
  )
}

function VinylCutterIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="8" rx="1" />
      <rect x="5" y="14" width="14" height="4" rx="1" strokeWidth="1.2" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" strokeWidth="1.5" />
      <circle cx="18" cy="10" r="0.8" fill="currentColor" />
      <line x1="16" y1="8" x2="19" y2="8" strokeWidth="0.8" />
      <g className="vinyl-head">
        <rect x="9" y="8" width="3" height="4" rx="0.5" fill="currentColor" fillOpacity="0.2" />
        <path d="M10.5 12v2.5l-1-1" strokeWidth="1.2" />
      </g>
      <path d="M8 16c2-1 4 1 6-0.5s2-2.5 3-1" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  )
}

function PowerToolsIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="wrench-screwdriver">
      <path d="M14.7 9.3l5.5 5.5a2.5 2.5 0 0 1-3.5 3.5l-5.5-5.5" />
      <path d="M10.2 4.8a4 4 0 0 0-5.7 5.7l1.8-1.8a1.5 1.5 0 0 1 2.1 0 1.5 1.5 0 0 1 0 2.1l-1.8 1.8a4 4 0 0 0 5.7-5.7l-2.1 2.1" fill="currentColor" fillOpacity="0.1" />
      
      <path d="M15.5 4.5l4 4-2.5 2.5-4-4 2.5-2.5z" fill="currentColor" fillOpacity="0.15" />
      <line x1="14.5" y1="8.5" x2="7" y2="16" strokeWidth="2" />
      <line x1="7" y1="16" x2="4.5" y2="18.5" strokeWidth="2.5" />
      <path d="M4.5 18.5l-1.5 2 2-1.5-.5-.5z" fill="currentColor" />
    </svg>
  )
}

function ElectronicWorkbenchIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <rect x="4" y="6" width="12" height="12" rx="1" fill="currentColor" fillOpacity="0.05" />
      <line x1="4" y1="12" x2="16" y2="12" strokeWidth="0.6" strokeDasharray="2 2" />
      <line x1="10" y1="6" x2="10" y2="18" strokeWidth="0.6" strokeDasharray="2 2" />
      <path d="M4 12c1.5-4 2.5-4 4 0s2.5 4 4 0 2.5-4 4 0" strokeWidth="1.8" stroke="var(--link)" className="oscilloscope-wave" />
      <circle cx="19" cy="8" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="16" r="1" />
    </svg>
  )
}
