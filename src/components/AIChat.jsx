import { useEffect, useRef, useState } from 'react'
import { FaTimes, FaPaperPlane, FaCopy, FaCheck } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  ELECTRONIC_COMPONENT_OPTION_GROUPS,
  INVENTORY_QTY,
  MACHINE_OPTION_GROUPS,
  POWER_TOOL_OPTION_GROUPS,
  TOOL_OPTION_GROUPS,
} from '../data/equipmentOptions'

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions'
const AVAILABILITY_API_URL = import.meta.env.VITE_AVAILABILITY_API_URL || ''

const flattenGroupOptions = (groups) => groups.flatMap((group) => group.options)

const ALL_EQUIPMENT = Array.from(
  new Set([
    ...flattenGroupOptions(MACHINE_OPTION_GROUPS),
    ...flattenGroupOptions(ELECTRONIC_COMPONENT_OPTION_GROUPS),
    ...flattenGroupOptions(POWER_TOOL_OPTION_GROUPS),
    ...flattenGroupOptions(TOOL_OPTION_GROUPS),
  ])
)

const EQUIPMENT_WITH_QTY = ALL_EQUIPMENT.map((item) => ({
  item,
  qty: INVENTORY_QTY[item],
  normalized: item.toLowerCase(),
}))

const CATEGORY_ITEMS = {
  MACHINES: flattenGroupOptions(MACHINE_OPTION_GROUPS),
  'ELECTRONIC COMPONENTS': flattenGroupOptions(ELECTRONIC_COMPONENT_OPTION_GROUPS),
  'POWER TOOLS': flattenGroupOptions(POWER_TOOL_OPTION_GROUPS),
  TOOLS: flattenGroupOptions(TOOL_OPTION_GROUPS),
}

const ITEM_TO_CATEGORY = new Map(
  Object.entries(CATEGORY_ITEMS).flatMap(([category, items]) => items.map((item) => [item, category]))
)

const MACHINE_NAMES = flattenGroupOptions(MACHINE_OPTION_GROUPS)

const EQUIPMENT_SUMMARY = `
Inventory summary:
- Machines: ${flattenGroupOptions(MACHINE_OPTION_GROUPS).length}
- Electronic items: ${flattenGroupOptions(ELECTRONIC_COMPONENT_OPTION_GROUPS).length}
- Power tools: ${flattenGroupOptions(POWER_TOOL_OPTION_GROUPS).length}
- Tools and consumables: ${flattenGroupOptions(TOOL_OPTION_GROUPS).length}
- Total unique equipment items: ${ALL_EQUIPMENT.length}
`.trim()

const isAvailabilityQuery = (query) =>
  /\b(available|availability|in stock|stock|have|do you have|left|remaining|can i get|is there)\b/i.test(
    String(query || '')
  )

const asksSpecificQuantity = (query) => {
  const q = String(query || '').toLowerCase()
  return /\b(how many|quantity|qty|count)\b/.test(q) || /\b\d+\b/.test(q)
}

const getAlternatives = (item, limit = 4) => {
  const category = ITEM_TO_CATEGORY.get(item)
  if (!category) return []
  return CATEGORY_ITEMS[category].filter((candidate) => candidate !== item).slice(0, limit)
}

const buildEquipmentContext = (query) => {
  const q = String(query || '').toLowerCase()

  const tokens = q
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)

  const matched = EQUIPMENT_WITH_QTY.filter(({ normalized }) => tokens.some((token) => normalized.includes(token))).slice(0, 60)

  const availabilityAsked = isAvailabilityQuery(query)
  const quantityRequested = asksSpecificQuantity(query)

  if (matched.length > 0) {
    if (availabilityAsked) {
      const availabilityLines = matched.slice(0, 12).map(({ item, qty }) => {
        const alternatives = getAlternatives(item)
        const altText = alternatives.length > 0 ? ` | alternatives: ${alternatives.join(', ')}` : ''

        if (quantityRequested) {
          return `- ${item}: ${qty != null ? `available qty ${qty}` : 'availability unknown'}${altText}`
        }

        const status = qty == null ? 'availability unknown' : qty > 0 ? 'available' : 'not available'
        return `- ${item}: ${status}${altText}`
      })

      return `${EQUIPMENT_SUMMARY}\n\nAvailability request context (use this for direct availability answer):\n${availabilityLines.join(
        '\n'
      )}`
    }

    const relevantList = matched
      .slice(0, 12)
      .map(({ item }) => `- ${item}`)
      .join('\n')

    return `${EQUIPMENT_SUMMARY}\n\nRelevant equipment names for this question (do not include quantities):\n${relevantList}`
  }

  return `${EQUIPMENT_SUMMARY}\n\nNo direct equipment keyword match found in the user query. Give a concise baseline answer and ask a follow-up for specific item names.`
}

const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant for Tinkerers' Lab GECI - a student-operated makerspace at GECI college.

Your role is to:
1. Answer questions about the lab, equipment, and activities
2. Help with project ideas based on available equipment
3. Provide coding assistance (Arduino, Python, etc.)
4. Answer common doubts and concerns about lab usage
5. Explain how to use specific machines and tools
6. Guide beginners and experienced makers

Available equipment includes:
- MACHINES: 3D Printers, Laser Cutter, Vinyl Cutter
- ELECTRONICS: Arduino, ESP32, sensors (ultrasonic, motion, temperature, humidity, gas, etc.), motors, modules
- POWER TOOLS: Angle grinders, drills, sanders, etc.
- HAND TOOLS: Hammers, pliers, spanners, screwdrivers, etc.

Always be encouraging. The lab is a learning space where mistakes are part of growth.
If asked about bookings/slots, direct them to the Slot Booking page but don't make actual bookings.
Keep responses concise but helpful (under 250 words). Use emojis occasionally to be friendly.
Do not provide the full equipment list unless the user explicitly asks for the complete inventory.
For normal equipment questions, only provide concise baseline info.
When user asks availability of a specific item, use the provided availability context and include 2-4 alternatives when possible.
Do not reveal numeric quantity unless the user explicitly asks quantity/count or includes a number in the request.

Important: You represent TL GECI. Be professional, helpful, and supportive.`

const CodeBlock = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'text'
  const codeString = String(children).replace(/\n$/, '')

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!inline && match) {
    return (
      <div className="codeBlockWrapper" style={{ position: 'relative', marginTop: '1rem', marginBottom: '1rem', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#a0a0a0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{language}</span>
          <button onClick={handleCopy} style={{ background: 'none', border: 'none', color: copied ? '#4ade80' : '#a0a0a0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.2rem' }}>
            {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.85rem' }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    )
  }
  return (
    <code className={className} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.15rem 0.3rem', borderRadius: '4px', fontSize: '0.85em' }} {...props}>
      {children}
    </code>
  )
}

function normalizeTimeTo24(raw) {
  let value = String(raw || '').trim().toLowerCase()

  // Accept human-entered variants like "5 30", "5.30", or "5-30".
  value = value.replace(/^(\d{1,2})[\s.\-]([0-5]\d)(\s*(am|pm))?$/i, (_, h, m, suffix) => {
    return `${h}:${m}${suffix || ''}`
  })

  const m12 = /^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)$/.exec(value)
  if (m12) {
    let hour = Number(m12[1]) % 12
    const minute = m12[2] || '00'
    if (m12[3] === 'pm') hour += 12
    return `${String(hour).padStart(2, '0')}:${minute}`
  }

  const m24 = /^([01]?\d|2[0-3])(?::([0-5]\d))$/.exec(value)
  if (m24) {
    return `${String(Number(m24[1])).padStart(2, '0')}:${m24[2]}`
  }

  const mHourOnly = /^([01]?\d|2[0-3])$/.exec(value)
  if (mHourOnly) {
    return `${String(Number(mHourOnly[1])).padStart(2, '0')}:00`
  }

  return ''
}

function normalizeTimeTo24WithMeridiemHint(raw, meridiemHint) {
  const value = String(raw || '').trim().toLowerCase()
  if (!value) return ''

  // If user already provided am/pm, parse directly.
  if (/\b(am|pm)\b/.test(value)) return normalizeTimeTo24(value)

  // If hint exists (from counterpart time), attach it for consistent interpretation.
  if (meridiemHint === 'am' || meridiemHint === 'pm') {
    return normalizeTimeTo24(`${value} ${meridiemHint}`)
  }

  return normalizeTimeTo24(value)
}

function extractMeridiem(raw) {
  const m = /\b(am|pm)\b/i.exec(String(raw || ''))
  return m ? m[1].toLowerCase() : ''
}

function parseDateFromText(text) {
  const lower = String(text || '').toLowerCase()
  const today = new Date()

  if (/\btoday\b/.test(lower)) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }

  if (/\btomorrow\b/.test(lower)) {
    const t = new Date(today)
    t.setDate(t.getDate() + 1)
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }

  const iso = /\b(20\d{2}-\d{2}-\d{2})\b/.exec(lower)
  if (iso) return iso[1]
  return ''
}

function parseTimeRangeFromText(text) {
  const lower = String(text || '').toLowerCase()
  const timeToken = '(?:\\d{1,2}(?:(?::|[\\s.\\-])\\d{2})?\\s*(?:am|pm)?)'
  const range = new RegExp(`(${timeToken})[\\s]*(?:to|and|\\-|–|—)[\\s]*(${timeToken})`, 'i').exec(
    lower
  )

  const betweenRange = new RegExp(`between\\s+(${timeToken})\\s+and\\s+(${timeToken})`, 'i').exec(
    lower
  )

  const picked = range || betweenRange

  if (!picked) return { timeFrom: '', timeTo: '' }

  const partA = picked[1]
  const partB = picked[2]
  const meridiemA = extractMeridiem(partA)
  const meridiemB = extractMeridiem(partB)

  const timeFrom = normalizeTimeTo24WithMeridiemHint(partA, meridiemA || meridiemB)
  const timeTo = normalizeTimeTo24WithMeridiemHint(partB, meridiemB || meridiemA)
  if (!timeFrom || !timeTo) return { timeFrom: '', timeTo: '' }
  return { timeFrom, timeTo }
}

function levenshteinDistance(a, b) {
  const s = String(a || '')
  const t = String(b || '')
  const m = s.length
  const n = t.length
  if (m === 0) return n
  if (n === 0) return m

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }

  return dp[m][n]
}

function bestMachineByFuzzyText(text) {
  const lower = String(text || '').toLowerCase()
  const hasMachineHint = /\b(printer|laser|cricut|vinyl|machine|3d)\b/.test(lower)
  const words = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)

  // Avoid false positives on short replies like "yes".
  if (!words.length || (!hasMachineHint && words.length < 2)) return ''

  let best = ''
  let bestScore = Infinity
  for (const name of MACHINE_NAMES) {
    const machine = name.toLowerCase()
    const machineWords = machine.split(/\s+/)
    for (const w of words) {
      for (const mw of machineWords) {
        const d = levenshteinDistance(w, mw)
        if (d < bestScore) {
          bestScore = d
          best = name
        }
      }
    }
  }

  // Conservative threshold to avoid wrong machine auto-selection.
  return bestScore <= 2 ? best : ''
}

function parseMaterialFromLab(text, isAwaitingMaterial = false) {
  const lower = String(text || '').toLowerCase()
  if (isAwaitingMaterial) {
    const yn = parseYesNo(lower)
    if (yn) return yn === 'yes' ? 'Yes' : 'No'
  }
  // Negative patterns: before or after material word
  // e.g., "no material", "material is not from lab", "not taking material", "bringing my own"
  if (/\b(no|not using|without|dont need|do not need|bring my own|bringing my own)\b.*\b(material|materials)\b/.test(lower)) {
    return 'No'
  }
  if (/\b(material|materials)\b.*\b(is\s+)?not\b/.test(lower)) {
    return 'No'
  }
  if (/\b(not|never|no|don't|dont).*\b(from\s+)?lab\b/.test(lower)) {
    return 'No'
  }
  if (/\b(yes|need|using|use|take|get)\b.*\b(material|materials|consumables)\b/.test(lower)) {
    return 'Yes'
  }
  if (/\bfrom\s+(the\s+)?lab\b/.test(lower) && !/\bnot\b|\bdon't\b|\bdont\b/.test(lower)) {
    return 'Yes'
  }
  return ''
}

function parsePurposeFromText(text) {
  const raw = String(text || '').trim()
  if (!raw) return ''

  const m = /\b(for|purpose\s*(is|:)?|to\s+build|to\s+work\s+on)\b[\s:,-]*(.+)$/i.exec(raw)
  if (m && m[3]) {
    const value = m[3].trim()
    return value.length >= 4 ? value : ''
  }
  return ''
}

function parseYesNo(text) {
  const raw = String(text || '').trim().toLowerCase()
  if (/^(yes|y|yeah|yup|yea|yep|yes please|sure thing|ok|okay|sure|proceed|continue)$/.test(raw)) return 'yes'
  if (/^(no|n|nope|not now|later|cancel)$/.test(raw)) return 'no'
  return ''
}

function looksLikeNewQuestion(text) {
  const raw = String(text || '').trim()
  if (!raw) return false
  if (/[?]$/.test(raw)) return true
  return /\b(what|why|how|when|where|can\s+you|tell\s+me|explain)\b/i.test(raw)
}

function extractMachineFromText(text) {
  const lower = String(text || '').toLowerCase()
  const exact = MACHINE_NAMES.find((name) => lower.includes(name.toLowerCase())) || ''
  if (exact) return exact
  return bestMachineByFuzzyText(text)
}

function parseBookingIntentDetails(text) {
  const machine = extractMachineFromText(text)
  const date = parseDateFromText(text)
  const { timeFrom, timeTo } = parseTimeRangeFromText(text)
  return { machine, date, timeFrom, timeTo }
}

function fuzzyMatchAny(words, targets, maxDistance = 2) {
  for (const w of words) {
    for (const t of targets) {
      if (w === t) return true;
      if (w.length < 5 || t.length < 5) continue; // Require at least 5 chars for fuzzy to avoid massive false positives
      if (Math.abs(w.length - t.length) > 2) continue;
      if (levenshteinDistance(w, t) <= maxDistance) return true;
    }
  }
  return false;
}

function isLikelySlotIntent(text, parsed) {
  const lower = String(text || '').toLowerCase()
  const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  let score = 0;
  
  // 1. Direct explicit phrases
  if (/\b(time\s*slot|free\s*slot)\b/i.test(lower)) score += 3;

  // 2. Fuzzy match booking intent words
  const bookingTargets = ["booking", "reserve", "reservation", "slot", "book"];
  if (fuzzyMatchAny(words, bookingTargets, 2)) score += 2;
  else if (/\b(book|slot)\b/i.test(lower)) score += 2; // Catch strict 4-letter words since fuzzy ignores them
  
  // 3. Fuzzy match availability words
  const availabilityTargets = ["available", "availability", "avaliable"];
  if (fuzzyMatchAny(words, availabilityTargets, 2)) score += 1;

  // 4. Mentions time, date, or machine?
  if (parsed?.machine) score += 2;
  if (parsed?.date) score += 1;
  if (parsed?.timeFrom || parsed?.timeTo) score += 1;
  
  const timePhrase = /\b(from|to|today|tomorrow|am|pm|\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))\b/i
  if (timePhrase.test(lower)) score += 1;

  // Threshold: If score >= 3, it's very likely a machine booking intent.
  return score >= 3;
}

function buildPrefillBookingUrl({ machine, date, timeFrom, timeTo, purpose, materialFromLab }) {
  const params = new URLSearchParams({
    prefill: '1',
    machine: machine || '',
    date: date || '',
    timeFrom: timeFrom || '',
    timeTo: timeTo || '',
    purpose: purpose || '',
    materialFromLab: materialFromLab || '',
  })

  return `/booking?${params.toString()}`
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! 👋 I'm the TL GECI Lab Assistant. Ask me anything about:\n• Lab equipment & machines\n• Project ideas based on available components\n• Arduino/Python coding help\n• Lab rules & safety\n• How to use specific tools",
      sender: 'bot',
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [bookingDraft, setBookingDraft] = useState(null)
  const [pendingPrefillUrl, setPendingPrefillUrl] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])



  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const trimmedInput = input.trim()
      const parsedInput = parseBookingIntentDetails(trimmedInput)
      const isSlotIntent = isLikelySlotIntent(trimmedInput, parsedInput)
      const expectingBookingReply = Boolean(
        pendingPrefillUrl ||
          bookingDraft?.awaitingBookDecision ||
          bookingDraft?.awaitingPurpose ||
          bookingDraft?.awaitingMaterial
      )
      const shouldHandleBooking = isSlotIntent || expectingBookingReply

      if (expectingBookingReply && !isSlotIntent) {
        const yn = parseYesNo(trimmedInput)
        const isMaterialAnswer = Boolean(parseMaterialFromLab(trimmedInput, bookingDraft?.awaitingMaterial))
        const possiblePurpose = bookingDraft?.awaitingPurpose
          ? String(trimmedInput || '').trim().length >= 6
          : false
        const bookingContinuation = /\b(prefill|book|booking|slot|continue|proceed)\b/i.test(trimmedInput)

        const isBookingReply = Boolean(
          yn ||
            (bookingDraft?.awaitingMaterial && isMaterialAnswer) ||
            (bookingDraft?.awaitingPurpose && possiblePurpose)
        )

        if (!isBookingReply && !bookingContinuation && looksLikeNewQuestion(trimmedInput)) {
          setBookingDraft(null)
          setPendingPrefillUrl('')
        }
      }

      if (pendingPrefillUrl) {
        const yn = parseYesNo(trimmedInput)
        if (yn === 'yes') {
          const goMessage = {
            id: messages.length + 2,
            text: 'Perfect. Opening the prefilled booking form now. Please complete and submit the remaining details.',
            sender: 'bot',
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, goMessage])
          setPendingPrefillUrl('')
          setBookingDraft(null)
          window.location.href = pendingPrefillUrl
          return
        }

        if (yn === 'no') {
          const holdMessage = {
            id: messages.length + 2,
            text: 'No problem. I cancelled the prefill action. If you want, share a new machine/date/time and I can prepare it again.',
            sender: 'bot',
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, holdMessage])
          setPendingPrefillUrl('')
          setBookingDraft(null)
          return
        }

        if (!isSlotIntent) {
          setBookingDraft(null)
          setPendingPrefillUrl('')
        }
      }

      if (shouldHandleBooking) {
        const parsed = parsedInput
        const merged = {
          // Use newly provided slot details when present; otherwise keep existing draft.
          machine: parsed.machine || bookingDraft?.machine || '',
          date: parsed.date || bookingDraft?.date || '',
          timeFrom: parsed.timeFrom || bookingDraft?.timeFrom || '',
          timeTo: parsed.timeTo || bookingDraft?.timeTo || '',
          purpose: parsePurposeFromText(trimmedInput) || bookingDraft?.purpose || '',
          materialFromLab: parseMaterialFromLab(trimmedInput, bookingDraft?.awaitingMaterial) || bookingDraft?.materialFromLab || '',
          availabilityOk: bookingDraft?.availabilityOk || false,
          awaitingBookDecision: bookingDraft?.awaitingBookDecision || false,
          awaitingPurpose: bookingDraft?.awaitingPurpose || false,
          awaitingMaterial: bookingDraft?.awaitingMaterial || false,
        }

        setBookingDraft(merged)

        const missing = []
        if (!merged.machine) missing.push('machine name')
        if (!merged.date) missing.push('date (YYYY-MM-DD, today, or tomorrow)')
        if (!merged.timeFrom || !merged.timeTo) missing.push('time range (e.g., 14:00 to 16:00)')

        // If user changed slot details, reset availability decision so it re-checks the new slot.
        const slotChanged =
          merged.machine !== (bookingDraft?.machine || '') ||
          merged.date !== (bookingDraft?.date || '') ||
          merged.timeFrom !== (bookingDraft?.timeFrom || '') ||
          merged.timeTo !== (bookingDraft?.timeTo || '')
        if (slotChanged) {
          merged.availabilityOk = false
          merged.awaitingBookDecision = false
          merged.awaitingPurpose = false
          merged.awaitingMaterial = false
        }

        if (missing.length > 0) {
          const followUpMessage = {
            id: messages.length + 2,
            text: `I can help with slot availability and prefill booking. Please share: ${missing.join(', ')}.`,
            sender: 'bot',
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, followUpMessage])
          return
        }

        if (!AVAILABILITY_API_URL) {
          const prefillUrl = buildPrefillBookingUrl(merged)
          const noApiMessage = {
            id: messages.length + 2,
            text: `I can prefill the booking form, but live availability API is not configured yet. Use this link: ${prefillUrl}`,
            sender: 'bot',
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, noApiMessage])
          setPendingPrefillUrl('')
          setBookingDraft(null)
          return
        }

        if (merged.awaitingBookDecision) {
          const yn = parseYesNo(trimmedInput)
          if (yn === 'yes') {
            merged.awaitingBookDecision = false
            merged.awaitingPurpose = !merged.purpose
            merged.awaitingMaterial = !merged.materialFromLab
            setBookingDraft(merged)
          } else if (yn === 'no') {
            const noBookMessage = {
              id: messages.length + 2,
              text: 'No problem. I will not proceed with booking. If you want another slot, share machine/date/time and I can check again.',
              sender: 'bot',
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, noBookMessage])
            setBookingDraft(null)
            setPendingPrefillUrl('')
            return
          } else {
            const clarifyMessage = {
              id: messages.length + 2,
              text: 'Please reply with Yes or No: do you want to book this available slot?',
              sender: 'bot',
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, clarifyMessage])
            return
          }
        }

        if (merged.awaitingPurpose) {
          const directPurpose = parsePurposeFromText(trimmedInput)
          const loosePurpose = String(trimmedInput || '').trim()
          const purposeText = directPurpose || (loosePurpose.length >= 6 ? loosePurpose : '')
          if (!purposeText) {
            const askPurposeAgain = {
              id: messages.length + 2,
              text: 'Please tell me the purpose of using the lab for this booking (for example: PCB prototyping, robot chassis print, project demo prep).',
              sender: 'bot',
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, askPurposeAgain])
            return
          }
          merged.purpose = purposeText
          merged.awaitingPurpose = false
          merged.awaitingMaterial = !merged.materialFromLab
          setBookingDraft(merged)
        }

        if (merged.awaitingMaterial) {
          const mat = parseMaterialFromLab(trimmedInput, true)
          if (!mat) {
            const askMaterialAgain = {
              id: messages.length + 2,
              text: 'Are you taking material from the lab for this booking? Please reply Yes or No.',
              sender: 'bot',
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, askMaterialAgain])
            return
          }
          merged.materialFromLab = mat
          merged.awaitingMaterial = false
          setBookingDraft(merged)
        }

        if (!merged.availabilityOk) {
          const query = new URLSearchParams({
            action: 'availability',
            machine: merged.machine,
            date: merged.date,
            timeFrom: merged.timeFrom,
            timeTo: merged.timeTo,
          })

          const availabilityResp = await fetch(`${AVAILABILITY_API_URL}?${query.toString()}`)
          const availabilityData = await availabilityResp.json()

          const isAvailable = Boolean(availabilityData?.ok && availabilityData?.available)
          if (!isAvailable) {
            const suggestions = Array.isArray(availabilityData?.suggestions) ? availabilityData.suggestions : []
            const suggestionsText = suggestions.length
              ? `\nSuggested slots:\n${suggestions.map((s) => `- ${s.date} ${s.timeFrom} to ${s.timeTo}`).join('\n')}`
              : ''
            const unavailableMessage = {
              id: messages.length + 2,
              text: `${merged.machine} is not available for ${merged.date} ${merged.timeFrom}-${merged.timeTo}.${suggestionsText}\n\nShare another time slot and I can check again.`,
              sender: 'bot',
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, unavailableMessage])
            return
          }

          merged.availabilityOk = true
          merged.awaitingBookDecision = true
          merged.awaitingPurpose = false
          merged.awaitingMaterial = false
          setBookingDraft(merged)

          const availableMessage = {
            id: messages.length + 2,
            text: `${merged.machine} is available for ${merged.date} ${merged.timeFrom}-${merged.timeTo}.\n\nDo you want to book this slot now?`,
            sender: 'bot',
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, availableMessage])
          return
        }

        const needsPurpose = !merged.purpose
        if (needsPurpose) {
          merged.awaitingPurpose = true
          merged.awaitingMaterial = false
          setBookingDraft(merged)
          const askPurpose = {
            id: messages.length + 2,
            text: 'Great. What is the purpose of using the lab for this booking?',
            sender: 'bot',
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, askPurpose])
          return
        }

        const needsMaterial = !merged.materialFromLab
        if (needsMaterial) {
          merged.awaitingMaterial = true
          setBookingDraft(merged)
          const askMaterial = {
            id: messages.length + 2,
            text: 'Are you taking material from the lab for this booking? Please reply Yes or No.',
            sender: 'bot',
            timestamp: Date.now(),
          }
          setMessages((prev) => [...prev, askMaterial])
          return
        }

        const prefillUrl = buildPrefillBookingUrl(merged)
        setPendingPrefillUrl(prefillUrl)
        const availableMessage = {
          id: messages.length + 2,
          text: `${merged.machine} is available for ${merged.date} ${merged.timeFrom}-${merged.timeTo}.\nPurpose: ${merged.purpose}\nMaterial from lab: ${merged.materialFromLab}\n\nDo you want me to open the prefilled booking form now?`,
          sender: 'bot',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, availableMessage])
        return
      }

      const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY

      if (!apiKey) {
        throw new Error('Hugging Face API key not configured. Add VITE_HUGGINGFACE_API_KEY to .env')
      }

      // Build the messages array for Chat Completions API
      const equipmentContext = buildEquipmentContext(input)
      const recentConversation = messages.filter((m) => m.id > 1).slice(-8)
      const chatMessages = [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${equipmentContext}` },
        ...recentConversation.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        { role: 'user', content: input },
      ]

      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/Meta-Llama-3-8B-Instruct',
          messages: chatMessages,
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.95,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || errorData.error?.error || errorData.error || 'API request failed')
      }

      const data = await response.json()

      // Extract the generated text from response
      let botReply = ''
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        botReply = data.choices[0].message.content.trim()
      } else {
        console.error('Unexpected response:', data)
        throw new Error('Unexpected API response format')
      }

      if (!botReply || botReply.length < 5) {
        botReply = 'I had trouble generating a response. Could you rephrase your question?'
      }

      const botMessage = {
        id: messages.length + 2,
        text: botReply,
        sender: 'bot',
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      const errorMessage = {
        id: messages.length + 2,
        text: `Error: ${error.message}`,
        sender: 'bot',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Chat Widget Toggle Button */}
      {!isOpen && (
        <button
          className="aiChatToggle"
          onClick={() => setIsOpen(true)}
          title="Open AI Lab Assistant"
          aria-label="Open AI Lab Assistant"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="aiChatWindow">
          <div className="aiChatHeader">
            <h3>TL GECI Lab Assistant</h3>
            <button
              className="aiChatClose"
              onClick={() => setIsOpen(false)}
              title="Close chat"
              aria-label="Close chat"
            >
              <FaTimes size={18} />
            </button>
          </div>

          <div className="aiChatMessages">
            {messages.map((msg) => (
              <div key={msg.id} className={`aiChatMessage aiChatMessage${msg.sender === 'user' ? 'User' : 'Bot'}`}>
                <div className="aiChatMessageContent">
                  {msg.sender === 'user' ? (
                    msg.text
                  ) : (
                    <ReactMarkdown
                      components={{
                        code: CodeBlock,
                        p: ({node, ...props}) => <p style={{ margin: '0 0 0.6rem 0' }} {...props} />,
                        ul: ({node, ...props}) => <ul style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.2rem' }} {...props} />,
                        ol: ({node, ...props}) => <ol style={{ margin: '0 0 0.6rem 0', paddingLeft: '1.2rem' }} {...props} />,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="aiChatMessage aiChatMessageBot">
                <div className="aiChatMessageContent">
                  <div className="aiChatTyping">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="aiChatInput">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={loading}
              aria-label="Chat input"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <FaPaperPlane size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
