import { useEffect, useState } from 'react'
import emailjs from '@emailjs/browser'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa'
import CursorPlane from './components/CursorPlane.jsx'
import NavBar from './components/NavBar.jsx'
import AIChat from './components/AIChat.jsx'
import HomePage from './pages/HomePage.jsx'
import EventsPage from './pages/EventsPage.jsx'
import TeamPage from './pages/TeamPage.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import SlotBookingPage from './pages/SlotBookingPage.jsx'

const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+65', '+971']
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

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

  useEffect(() => {
    // Prevent the browser from automatically restoring the scroll position on reload
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    // Always start at the top on route change or reload
    window.scrollTo(0, 0)
  }, [location.pathname])
  const [contactForm, setContactForm] = useState({
    name: '',
    countryCode: '+91',
    phone: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSendingContact, setIsSendingContact] = useState(false)
  const [contactStatus, setContactStatus] = useState({ type: '', text: '' })

  const updateContactField = (field) => (event) => {
    setContactForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const onContactSubmit = async (event) => {
    event.preventDefault()
    const name = contactForm.name.trim()
    const countryCode = contactForm.countryCode.trim()
    const phone = contactForm.phone.trim()
    const email = contactForm.email.trim()
    const subject = contactForm.subject.trim()
    const message = contactForm.message.trim()

    if (!name || !phone || !email || !subject || !message) {
      return
    }

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      setContactStatus({
        type: 'error',
        text: 'Contact form is not configured. Add EmailJS keys in environment variables.',
      })
      return
    }

    setIsSendingContact(true)
    setContactStatus({ type: '', text: '' })

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: name,
          from_email: email,
          reply_to: email,
          phone_number: `${countryCode} ${phone}`,
          message,
          subject: `${subject} - ${name}`,
          reply_hint: 'Please reply to this mail to contact the sender directly.',
        },
        {
          publicKey: EMAILJS_PUBLIC_KEY,
        }
      )

      setContactStatus({
        type: 'success',
        text: 'Message sent successfully. We will get back to you soon.',
      })
      setContactForm({
        name: '',
        countryCode: '+91',
        phone: '',
        email: '',
        subject: '',
        message: '',
      })
    } catch {
      setContactStatus({
        type: 'error',
        text: 'Unable to send message right now. Please try again in a moment.',
      })
    } finally {
      setIsSendingContact(false)
    }
  }

  return (
    <>
      <div className="appBgLayer" aria-hidden="true">
        <CursorPlane />
      </div>

      <AIChat />

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
                  <a href="mailto:tinkererslabgeci@gecidukki.ac.in">tinkererslabgeci@gecidukki.ac.in</a>
                </li>
                <li>
                  Phone: <a href="tel:+918078479399">+91 80784 79399</a>
                </li>
              </ul>

              <form className="footerContactForm" onSubmit={onContactSubmit}>
                <label htmlFor="footer-contact-question" className="footerContactLabel">Contact Us</label>
                <input
                  id="footer-contact-name"
                  className="footerContactInput"
                  type="text"
                  placeholder="Your name"
                  value={contactForm.name}
                  onChange={updateContactField('name')}
                  required
                />

                <div className="footerContactPhoneRow">
                  <select
                    id="footer-contact-country-code"
                    className="footerContactInput footerContactCountryCode"
                    value={contactForm.countryCode}
                    onChange={updateContactField('countryCode')}
                    aria-label="Country code"
                  >
                    {COUNTRY_CODES.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>

                  <input
                    id="footer-contact-phone"
                    className="footerContactInput"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Phone number"
                    value={contactForm.phone}
                    onChange={updateContactField('phone')}
                    required
                  />
                </div>

                <input
                  id="footer-contact-email"
                  className="footerContactInput"
                  type="email"
                  placeholder="Email address"
                  value={contactForm.email}
                  onChange={updateContactField('email')}
                  required
                />

                <input
                  id="footer-contact-subject"
                  className="footerContactInput"
                  type="text"
                  placeholder="Subject"
                  value={contactForm.subject}
                  onChange={updateContactField('subject')}
                  required
                />

                <textarea
                  id="footer-contact-question"
                  className="footerContactInput"
                  rows={4}
                  placeholder="Type your message..."
                  value={contactForm.message}
                  onChange={updateContactField('message')}
                  required
                />
                <button type="submit" className="btn footerContactBtn" disabled={isSendingContact}>
                  {isSendingContact ? 'Sending...' : 'Send Mail'}
                </button>
                {contactStatus.text && (
                  <p className={`footerContactStatus ${contactStatus.type === 'success' ? 'isSuccess' : 'isError'}`}>
                    {contactStatus.text}
                  </p>
                )}
              </form>
            </div>

            <div className="footerCol">
              <h3 className="footerTitle">Social</h3>
              <ul className="footerList footerSocialRow">
                <li>
                  <a
                    className="footerIconLink"
                    href="https://www.instagram.com/tinkerers_lab_geci"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram: @tinkerers_lab_geci"
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
                    href="https://whatsapp.com/channel/0029VbBw4kgIt5ruKlKFKb1b"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="WhatsApp: +91 80784 79399"
                  >
                    <FaWhatsapp className="footerBrandIcon" aria-hidden="true" focusable="false" />
                  </a>
                </li>
              </ul>
            </div>

            <div className="footerCol">
              <h3 className="footerTitle">Location</h3>
              <ul className="footerList">
                <li>Tinkerers' Lab </li>
                <li>Administrative Block, GEC Idukki, </li>
                <li>Painavu, Kerala, 685603</li>
                <li>
                  <a href="https://maps.app.goo.gl/EBjjch8Lqf53ipr66" target="_blank" rel="noreferrer">
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
