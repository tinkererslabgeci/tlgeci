import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa'
import CursorPlane from './components/CursorPlane.jsx'
import NavBar from './components/NavBar.jsx'
import HomePage from './pages/HomePage.jsx'
import EventsPage from './pages/EventsPage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import SlotBookingPage from './pages/SlotBookingPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <>
      <div className="appBgLayer" aria-hidden="true">
        <CursorPlane />
      </div>

      <div className="appFg">
        <NavBar deferMs={isHome ? 1800 : 0} />
        <main style={isHome ? { padding: 0 } : { padding: '3.25rem 0 4rem' }}>
          {isHome ? (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <div className="container">
              <Routes>
                <Route path="/events" element={<EventsPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/booking" element={<SlotBookingPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          )}
        </main>

        <footer className="siteFooter">
          <div className="grid cols-3">
            <div className="footerCol">
              <h3 className="footerTitle">Contact</h3>
              <ul className="footerList">
                <li>
                  Email:{' '}
                  <a href="mailto:hello@tinkererslab.example">hello@tinkererslab.example</a>
                </li>
                <li>
                  Phone: <a href="tel:+910000000000">+91 00000 00000</a>
                </li>
              </ul>
            </div>

            <div className="footerCol">
              <h3 className="footerTitle">Social</h3>
              <ul className="footerList footerSocialRow">
                <li>
                  <a
                    className="footerIconLink"
                    href="https://instagram.com/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram: @tinkererslab"
                  >
                    <FaInstagram className="footerBrandIcon" aria-hidden="true" focusable="false" />
                  </a>
                </li>
                <li>
                  <a
                    className="footerIconLink"
                    href="https://linkedin.com/"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="LinkedIn: Tinkerers Lab"
                  >
                    <FaLinkedinIn className="footerBrandIcon" aria-hidden="true" focusable="false" />
                  </a>
                </li>
                <li>
                  <a
                    className="footerIconLink"
                    href="https://wa.me/910000000000"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp: +91 00000 00000"
                  >
                    <FaWhatsapp className="footerBrandIcon" aria-hidden="true" focusable="false" />
                  </a>
                </li>
              </ul>
            </div>

            <div className="footerCol">
              <h3 className="footerTitle">Location</h3>
              <ul className="footerList">
                <li>Administrative Block, GEC Idukki, Painavu, Kerala, 685603</li>
                <li>
                  <a href="https://maps.google.com/" target="_blank" rel="noreferrer">
                    Open in Google Maps
                  </a>
                </li>
                <li>Open: 24/7 (student-managed)</li>
              </ul>
            </div>
          </div>

          <div className="footerCredits">
            © {new Date().getFullYear()} All rights reserved • TL GECI
          </div>
        </footer>
      </div>
    </>
  )
}
