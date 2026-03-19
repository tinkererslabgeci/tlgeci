import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'

const linkStyle = ({ isActive }) => ({
  textDecoration: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.14)',
  background: isActive ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.06)',
  color: 'rgba(255, 255, 255, 0.92)',
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
        background: 'rgba(11, 18, 32, 0.70)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
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
              width: 44,
              height: 44,
              borderRadius: 10,
              background: '#f5f5f5',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo/tlgeci-logo.png"
              alt="TL GECI logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', transform: 'scale(1.14)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 700 }}>Tinkerers Lab</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.92rem' }}>GECI</span>
          </div>
        </div>

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
    </header>
  )
}
