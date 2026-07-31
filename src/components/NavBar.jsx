import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { APPS_SCRIPT_WEB_APP_URL } from '../pages/SlotBookingPage.jsx'

const linkStyle = ({ isActive }) => ({
  textDecoration: 'none',
  padding: '0.5rem 0.75rem',
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: isActive ? 'var(--panel-strong)' : 'var(--panel)',
  color: 'var(--text)',
})

export default function NavBar({ deferMs = 0, theme, toggleTheme }) {
  const [visible, setVisible] = useState(deferMs === 0)
  const [isMobile, setIsMobile] = useState(false)
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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

  const hideHeader = isMobile && hiddenOnScroll && !isMenuOpen
  const headerOpacity = visible && !hideHeader ? 1 : 0
  const headerTransform = !visible ? 'translateY(-10px)' : hideHeader ? 'translateY(-110%)' : 'translateY(0)'
  const headerPointerEvents = visible && !hideHeader ? 'auto' : 'none'

  const [isLabOpen, setIsLabOpen] = useState(true)

  useEffect(() => {
    let lastFetchedTime = 0
    const CACHE_TTL = 60000 // 60s cache guard

    const fetchStatus = async (force = false) => {
      const now = Date.now()
      // Skip if tab is hidden or fetched within cache window
      if (!force && (document.visibilityState === 'hidden' || now - lastFetchedTime < CACHE_TTL)) {
        return
      }

      try {
        const res = await fetch(`${APPS_SCRIPT_WEB_APP_URL}?action=getLabStatus`)
        const data = await res.json()
        if (data && data.ok) {
          setIsLabOpen(data.status === 'OPEN')
          lastFetchedTime = Date.now()
        }
      } catch (err) {
        // Fallback gracefully
      }
    }

    // Initial fetch on page load
    fetchStatus(true)

    // Fetch immediately when user switches back to this tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Gentle 2-minute interval (only fires if tab is active)
    const interval = setInterval(() => fetchStatus(false), 120000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(interval)
    }
  }, [])

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
        <div
          className={`brandLightContainer ${isLabOpen ? 'isLabOpen' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.4rem 0.85rem 0.4rem 0.45rem',
            borderRadius: 14,
            border: isLabOpen ? '1px solid rgba(245, 158, 11, 0.85)' : '1px solid var(--border-strong)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
          title={isLabOpen ? "Tinkerers' Lab is OPEN NOW" : "Tinkerers' Lab is CLOSED"}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              background: 'transparent',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={theme === 'dark' ? '/logo/tlgeci-logowhite.png' : '/logo/tlgeci-logoblack.png'}
              alt="TL GECI logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', transform: 'scale(1.15)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.02rem' }}>Tinkerers' Lab</span>
              {isLabOpen && (
                <span className="warmStatusBeacon" title="Tinkerers' Lab is currently OPEN">
                  OPEN
                </span>
              )}
            </div>
            <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>GECI</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className="themeToggleBtn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <svg className="themeToggleIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg className="themeToggleIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          {isMobile && (
            <button
              className="hamburgerBtn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              <div className={`hamburgerLine ${isMenuOpen ? 'open' : ''}`} />
              <div className={`hamburgerLine ${isMenuOpen ? 'open' : ''}`} />
              <div className={`hamburgerLine ${isMenuOpen ? 'open' : ''}`} />
            </button>
          )}

          <nav className={isMobile ? `mobileNav ${isMenuOpen ? 'open' : ''}` : 'desktopNav'}>
            <NavLink to="/" style={linkStyle} onClick={() => setIsMenuOpen(false)} end>
              Home
            </NavLink>
            <NavLink to="/events" style={linkStyle} onClick={() => setIsMenuOpen(false)}>
              Events
            </NavLink>
            <NavLink to="/team" style={linkStyle} onClick={() => setIsMenuOpen(false)}>
              Team
            </NavLink>
            <NavLink to="/gallery" style={linkStyle} onClick={() => setIsMenuOpen(false)}>
              Gallery
            </NavLink>
            <NavLink to="/booking" style={linkStyle} onClick={() => setIsMenuOpen(false)}>
              Slot Booking
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  )
}
