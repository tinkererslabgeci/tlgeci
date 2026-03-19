import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'

const linkStyle = ({ isActive }) => ({
  textDecoration: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: isActive ? 'var(--panel-strong)' : 'var(--panel)',
  color: 'var(--text)',
})

export default function NavBar({ deferMs = 0 }) {
  const [visible, setVisible] = useState(deferMs === 0)
  const [isMobile, setIsMobile] = useState(false)
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false)

  useEffect(() => {
    if (!deferMs) {
      setVisible(true)
      return
    }

    setVisible(false)
    const t = setTimeout(() => setVisible(true), deferMs)
    return () => clearTimeout(t)
  }, [deferMs])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onChange = () => setIsMobile(Boolean(mq.matches))
    onChange()

    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    if (!isMobile) {
      setHiddenOnScroll(false)
      return
    }

    let lastY = window.scrollY || 0
    let ticking = false
    const delta = 12

    function onScroll() {
      const y = window.scrollY || 0
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        // Always show near top.
        if (y <= 8) {
          setHiddenOnScroll(false)
        } else if (y > lastY + delta) {
          // Scrolling down.
          setHiddenOnScroll(true)
        } else if (y < lastY - delta) {
          // Scrolling up.
          setHiddenOnScroll(false)
        }
        lastY = y
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isMobile])

  const hideHeader = isMobile && hiddenOnScroll
  const headerOpacity = visible && !hideHeader ? 1 : 0
  const headerTransform = !visible ? 'translateY(-10px)' : hideHeader ? 'translateY(-110%)' : 'translateY(0)'
  const headerPointerEvents = visible && !hideHeader ? 'auto' : 'none'

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backdropFilter: 'blur(10px)',
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--border)',
        opacity: headerOpacity,
        transform: headerTransform,
        transition: 'opacity 280ms ease-out, transform 280ms ease-out',
        pointerEvents: headerPointerEvents,
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <div
            style={{
                width: 62,
                height: 62,
              borderRadius: 10,
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid var(--border-strong)',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo/tlgeci-logowhite.png"
              alt="TL GECI logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', transform: 'scale(1.2)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 700 }}>Tinkerers' Lab</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>GECI</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <NavLink to="/" style={linkStyle} end>
            Home
            </NavLink>

            <NavLink to="/events" style={linkStyle}>
            Events
            </NavLink>

            <NavLink to="/team" style={linkStyle}>
            Team
            </NavLink>

            <NavLink to="/gallery" style={linkStyle}>
            Gallery
            </NavLink>

            <NavLink to="/booking" style={linkStyle}>
            Slot Booking
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  )
}
