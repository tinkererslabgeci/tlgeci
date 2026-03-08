import { useEffect, useMemo, useRef, useState } from 'react'

import {
  CATEGORIES,
  DEPARTMENTS,
  ELECTRONIC_COMPONENT_OPTION_GROUPS,
  INVENTORY_QTY,
  MACHINE_OPTION_GROUPS,
  NONE_CATEGORY,
  POWER_TOOL_OPTION_GROUPS,
  SEMESTERS,
  TOOL_OPTION_GROUPS,
} from '../data/equipmentOptions'

const GOOGLE_FORM_VIEW_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeNywMWGjbzX1fAMmXDxcKGYNpsBDUSmS4UV_bdsj-9zAQnAQ/viewform'
const GOOGLE_FORM_RESPONSE_URL = GOOGLE_FORM_VIEW_URL.replace(/\/viewform(?:\?.*)?$/, '/formResponse')

const APPS_SCRIPT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbxdcdfDupYEEyTt-rojb7SRVKCinK0Iq0DfUy4uu4giRmdYn_Rh8MZJwy8Bad9AgO9b8Q/exec'

// IMPORTANT: to submit directly to Google Forms, we need the entry IDs.
// The easiest way is: Google Form editor → ⋮ → Get pre-filled link → fill each question → copy link.
// That link contains query params like entry.123456=...
// Paste that prefilled link here and I’ll map the IDs.
const GOOGLE_FORM_ENTRY = {
  name: '734945579',
  ktuId: '75794894',
  phone: '1906569776',
  email: '817135789',
  semester: '55906995',
  department: '303525166',
  purpose: '1012824678',
  category: '1835919832',
  machines: '173287038',
  electronicComponents: '154986440',
  powerTools: '1418554756',
  tools: '902323101',
  // New Google Form fields (fill from prefilled link if needed)
  materialFromLab: '673444253',
  materialApproxQty: '2057421952',
  materialFilamentMeters: '',
  // Long-answer question: "TOTAL" (all selected equipments with quantities)
  // Fill this with the entry id from your new prefilled link.
  total: '1262383128',
  date: '1948110390',
  timeFrom: '962636643',
  timeTo: '1454124321',

  // that captures Yes/No (+ optional certificate no) together.
  workingIndependently: '361198102',
  trainingCertificateNo: '',
}

// Optional: set this to your public Google Calendar embed URL to show lab schedule/bookings.
// Example format: https://calendar.google.com/calendar/embed?src=...&ctz=Asia%2FKolkata
const GOOGLE_CALENDAR_EMBED_URL = 'https://calendar.google.com/calendar/embed?src=c_40a1e8c67772b6202331dd1ec14c9d673085c174c58586a7e6e1739068395392%40group.calendar.google.com&ctz=Asia%2FKolkata'

function isConfiguredEntryMap(map) {
  return Object.values(map).some(Boolean)
}

function isConfiguredAppsScript(url) {
  return Boolean(String(url || '').trim())
}

function multiValueParams(params, entryId, values) {
  // Google Forms checkbox questions accept repeated entry.X keys.
  if (!entryId) return
  for (const v of values) params.append(`entry.${entryId}`, v)
}

function submitToGoogleForm({ payload, onDone }) {
  const iframeName = 'gform_hidden_iframe'
  const existingIframe = document.querySelector(`iframe[name="${iframeName}"]`)
  if (!existingIframe) {
    const iframe = document.createElement('iframe')
    iframe.name = iframeName
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
  }

  const form = document.createElement('form')
  form.action = GOOGLE_FORM_RESPONSE_URL
  form.method = 'POST'
  form.target = iframeName

  for (const [k, v] of payload.entries()) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = k
    input.value = v
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
  setTimeout(() => {
    form.remove()
    onDone?.()
  }, 600)
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toDateInputValue(d) {
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`
}

function toTimeInputValue(d) {
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`
}

function addMinutesToTimeStr(timeStr, minutes) {
  if (!timeStr || typeof timeStr !== 'string') return ''
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr)
  if (!m) return ''
  const hh = Number(m[1])
  const mm = Number(m[2])
  const total = hh * 60 + mm + Number(minutes || 0)
  const clamped = Math.max(0, Math.min(23 * 60 + 59, total))
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`
}

function ceilTimeToStep(timeStr, stepMinutes) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr || '')
  if (!m) return ''
  const hh = Number(m[1])
  const mm = Number(m[2])
  const step = Math.max(1, Number(stepMinutes) || 1)
  const total = hh * 60 + mm
  const ceiled = Math.min(23 * 60 + 59, Math.ceil(total / step) * step)
  return `${pad2(Math.floor(ceiled / 60))}:${pad2(ceiled % 60)}`
}

function parseDateInputValue(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(dateStr)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime())) return null
  // Ensure it round-trips (avoids weird JS date overflow)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return dt
}

function compareDateStr(a, b) {
  // YYYY-MM-DD string compare works lexicographically.
  if (!a || !b) return 0
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function formatTime12(timeStr) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr || '')
  if (!m) return ''
  const hh = Number(m[1])
  const mm = m[2]
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const hr12 = hh % 12 === 0 ? 12 : hh % 12
  return `${hr12}:${mm} ${ampm}`
}

function timeStrToMinutes(timeStr) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr || '')
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

function minutesToTimeStr(totalMinutes) {
  const t = Math.max(0, Math.min(23 * 60 + 59, Number(totalMinutes) || 0))
  return `${pad2(Math.floor(t / 60))}:${pad2(t % 60)}`
}

function timeStrToParts12(timeStr) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr || '')
  if (!m) return null
  const hh = Number(m[1])
  const minuteStr = m[2]
  const ampm = hh >= 12 ? 'PM' : 'AM'
  const hour12 = hh % 12 === 0 ? 12 : hh % 12
  return { hour12, minuteStr, ampm }
}

function parts12ToTimeStr({ hour12, minuteStr, ampm }) {
  const h12 = Math.max(1, Math.min(12, Number(hour12) || 12))
  const mm = pad2(Math.max(0, Math.min(59, Number(minuteStr) || 0)))
  const isPm = String(ampm).toUpperCase() === 'PM'
  let hh = h12 % 12
  if (isPm) hh += 12
  return `${pad2(hh)}:${mm}`
}

function clampDateStr(dateStr, minStr, maxStr) {
  let v = dateStr
  if (minStr && v && v < minStr) v = minStr
  if (maxStr && v && v > maxStr) v = maxStr
  return v
}

function PickerTrigger({ value, placeholder, onClick, disabled, iconType }) {
  return (
    <button type="button" className="input pickerTrigger" onClick={onClick} disabled={disabled}>
      <span style={{ opacity: value ? 1 : 0.7 }}>{value || placeholder}</span>
      <span className={`pickerIcon ${iconType || ''}`} aria-hidden="true" />
    </button>
  )
}

function CustomDatePicker({ value, onChange, minDate, maxDate }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(e) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  const selected = useMemo(() => parseDateInputValue(value), [value])
  const initial = selected || parseDateInputValue(minDate) || new Date()

  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  useEffect(() => {
    // Sync view when value changes from outside.
    const dt = parseDateInputValue(value)
    if (!dt) return
    setViewYear(dt.getFullYear())
    setViewMonth(dt.getMonth())
  }, [value])

  const viewMonthLabel = useMemo(() => {
    const dt = new Date(viewYear, viewMonth, 1)
    return dt.toLocaleString(undefined, { month: 'long', year: 'numeric' })
  }, [viewYear, viewMonth])

  const canPrev = useMemo(() => {
    if (!minDate) return true
    const min = parseDateInputValue(minDate)
    if (!min) return true
    const prev = new Date(viewYear, viewMonth - 1, 1)
    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1)
    return prev >= minMonth
  }, [minDate, viewYear, viewMonth])

  const canNext = useMemo(() => {
    if (!maxDate) return true
    const max = parseDateInputValue(maxDate)
    if (!max) return true
    const next = new Date(viewYear, viewMonth + 1, 1)
    const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1)
    return next <= maxMonth
  }, [maxDate, viewYear, viewMonth])

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const firstWeekday = first.getDay() // 0..6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [viewYear, viewMonth])

  const weekdayLabels = useMemo(() => {
    // Keep it short; uses user's locale.
    const base = new Date(2020, 4, 3) // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(base)
      dt.setDate(base.getDate() + i)
      return dt.toLocaleString(undefined, { weekday: 'short' })
    })
  }, [])

  function goPrev() {
    if (!canPrev) return
    const dt = new Date(viewYear, viewMonth - 1, 1)
    setViewYear(dt.getFullYear())
    setViewMonth(dt.getMonth())
  }

  function goNext() {
    if (!canNext) return
    const dt = new Date(viewYear, viewMonth + 1, 1)
    setViewYear(dt.getFullYear())
    setViewMonth(dt.getMonth())
  }

  function isDisabledDate(d) {
    if (!d) return true
    const ds = toDateInputValue(d)
    if (minDate && compareDateStr(ds, minDate) < 0) return true
    if (maxDate && compareDateStr(ds, maxDate) > 0) return true
    return false
  }

  function onPick(d) {
    if (!d) return
    const ds = clampDateStr(toDateInputValue(d), minDate, maxDate)
    onChange?.(ds)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="picker">
      <PickerTrigger value={value} placeholder="Select date" onClick={() => setOpen((v) => !v)} iconType="date" />

      {open ? (
        <div className="card pickerPanel" role="dialog" aria-label="Select date">
          <div className="pickerHeader">
            <button type="button" className="btn pickerNav" onClick={goPrev} disabled={!canPrev} aria-label="Previous month">
              ‹
            </button>
            <div className="pickerTitle">{viewMonthLabel}</div>
            <button type="button" className="btn pickerNav" onClick={goNext} disabled={!canNext} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="calWeekdays">
            {weekdayLabels.map((w) => (
              <div key={w} className="calWeekday">
                {w}
              </div>
            ))}
          </div>

          <div className="calGrid">
            {days.map((d, idx) => {
              if (!d) return <div key={idx} className="calCell calEmpty" />
              const ds = toDateInputValue(d)
              const disabled = isDisabledDate(d)
              const isSelected = value && ds === value
              return (
                <button
                  key={idx}
                  type="button"
                  className={`calCell calDay${disabled ? ' disabled' : ''}${isSelected ? ' selected' : ''}`}
                  onClick={() => onPick(d)}
                  disabled={disabled}
                  aria-selected={isSelected}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CustomTimePicker({ value, onChange, minTime, stepMinutes = 15, placeholder = 'Select time' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const [selHour, setSelHour] = useState(12)
  const [selMinute, setSelMinute] = useState('00')
  const [selAmPm, setSelAmPm] = useState('AM')

  useEffect(() => {
    if (!open) return
    function onDocDown(e) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  const step = useMemo(() => Math.max(1, Number(stepMinutes) || 15), [stepMinutes])
  const minuteOptions = useMemo(() => {
    const out = []
    for (let m = 0; m <= 59; m += step) out.push(pad2(m))
    return out
  }, [step])

  const hourOptions = useMemo(() => [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [])

  const effectiveMinTime = useMemo(() => {
    if (!minTime) return ''
    return ceilTimeToStep(minTime, step)
  }, [minTime, step])

  const minMinutes = useMemo(() => timeStrToMinutes(effectiveMinTime), [effectiveMinTime])

  useEffect(() => {
    if (!open) return

    const seed = value || effectiveMinTime || ''
    const parts = timeStrToParts12(seed) || { hour12: 12, minuteStr: '00', ampm: 'AM' }
    setSelHour(parts.hour12)
    setSelMinute(parts.minuteStr)
    setSelAmPm(parts.ampm)
  }, [open, value, effectiveMinTime])

  function applyNext(next) {
    const candidate = parts12ToTimeStr(next)
    const candMin = timeStrToMinutes(candidate)
    if (candMin == null) return

    let finalTime = candidate
    if (minMinutes != null && candMin < minMinutes) {
      finalTime = effectiveMinTime
    }

    const finalParts = timeStrToParts12(finalTime)
    if (finalParts) {
      setSelHour(finalParts.hour12)
      setSelMinute(finalParts.minuteStr)
      setSelAmPm(finalParts.ampm)
    }

    onChange?.(finalTime)
  }

  function isCandidateAllowed(parts) {
    if (minMinutes == null) return true
    const candidate = parts12ToTimeStr(parts)
    const candMin = timeStrToMinutes(candidate)
    if (candMin == null) return false
    return candMin >= minMinutes
  }

  return (
    <div ref={rootRef} className="picker">
      <PickerTrigger
        value={value ? formatTime12(value) : ''}
        placeholder={placeholder}
        onClick={() => setOpen((v) => !v)}
        iconType="time"
      />

      {open ? (
        <div className="card pickerPanel" role="dialog" aria-label="Select time">
          <div className="timeGrid">
            <div className="timeCol" aria-label="Select hour">
              {hourOptions.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`timeRow${h === selHour ? ' selected' : ''}`}
                  onClick={() => applyNext({ hour12: h, minuteStr: selMinute, ampm: selAmPm })}
                  disabled={!isCandidateAllowed({ hour12: h, minuteStr: selMinute, ampm: selAmPm })}
                  aria-selected={h === selHour}
                >
                  {h}
                </button>
              ))}
            </div>

            <div className="timeCol" aria-label="Select minute">
              {minuteOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`timeRow${m === selMinute ? ' selected' : ''}`}
                  onClick={() => applyNext({ hour12: selHour, minuteStr: m, ampm: selAmPm })}
                  disabled={!isCandidateAllowed({ hour12: selHour, minuteStr: m, ampm: selAmPm })}
                  aria-selected={m === selMinute}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="timeCol" aria-label="Select AM or PM">
              {['AM', 'PM'].map((ap) => (
                <button
                  key={ap}
                  type="button"
                  className={`timeRow${ap === selAmPm ? ' selected' : ''}`}
                  onClick={() => applyNext({ hour12: selHour, minuteStr: selMinute, ampm: ap })}
                  disabled={!isCandidateAllowed({ hour12: selHour, minuteStr: selMinute, ampm: ap })}
                  aria-selected={ap === selAmPm}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function addMonthsClamped(dateObj, months) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj)
  if (Number.isNaN(d.getTime())) return new Date(NaN)

  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()

  const targetMonthIndex = month + Number(months || 0)
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const safeDay = Math.min(day, daysInTargetMonth)
  return new Date(targetYear, targetMonth, safeDay)
}

function SearchMultiSelectDropdown({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(e) {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [open])

  const normalizedGroups = useMemo(() => {
    if (!Array.isArray(options) || options.length === 0) return []

    const first = options[0]
    if (typeof first === 'string') {
      return [{ label: 'Options', options }]
    }

    // Expect: [{ label: string, options: string[] }]
    return options
      .filter((g) => g && typeof g.label === 'string' && Array.isArray(g.options))
      .map((g) => ({ label: g.label, options: g.options }))
  }, [options])

  const filteredGroups = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return normalizedGroups
    return normalizedGroups
      .map((g) => ({
        label: g.label,
        options: g.options.filter((o) => o.toLowerCase().includes(t)),
      }))
      .filter((g) => g.options.length > 0)
  }, [q, normalizedGroups])

  const selectedLabel = useMemo(() => {
    if (!value.length) return placeholder
    if (value.length === 1) return value[0]
    return `${value.length} selected`
  }, [value, placeholder])

  return (
    <div ref={rootRef} className="dd">
      <button type="button" className="input ddTrigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span style={{ opacity: value.length ? 1 : 0.7 }}>{selectedLabel}</span>
        <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="card ddPanel" role="listbox" aria-multiselectable="true">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            style={{ marginBottom: '0.65rem' }}
          />

          <div className="ddList">
            {filteredGroups.flatMap((g) => {
              const rows = []
              rows.push(
                <div
                  key={`__group__${g.label}`}
                  style={{
                    marginTop: '0.35rem',
                    marginBottom: '0.15rem',
                    fontSize: '0.78rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    userSelect: 'none',
                  }}
                >
                  {g.label}
                </div>
              )

              for (const opt of g.options) {
                const checked = value.includes(opt)
                rows.push(
                  <label key={`${g.label}__${opt}`} className="ddOption">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) onChange([...value, opt])
                        else onChange(value.filter((v) => v !== opt))
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                )
              }
              return rows
            })}
            {filteredGroups.length === 0 ? (
              <div style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.92rem' }}>No matches</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MultiSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        {options.map((opt) => (
          <label key={opt} style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', color: 'rgba(255, 255, 255, 0.82)' }}>
            <input
              type="checkbox"
              checked={value.includes(opt)}
              onChange={(e) => {
                if (e.target.checked) onChange([...value, opt])
                else onChange(value.filter((v) => v !== opt))
              }}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {value.length ? (
        <div style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.92rem' }}>{value.length} selected</div>
      ) : (
        <div style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.92rem' }}>Select one or more</div>
      )}
    </div>
  )
}

export default function SlotBookingPage() {
  const [name, setName] = useState('')
  const [ktuId, setKtuId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [purpose, setPurpose] = useState('')
  const [categories, setCategories] = useState([])
  const [machines, setMachines] = useState([])
  const [electronicComponents, setElectronicComponents] = useState([])
  const [powerTools, setPowerTools] = useState([])
  const [tools, setTools] = useState([])
  const [itemQty, setItemQty] = useState({})
  const [date, setDate] = useState('')
  const [timeFrom, setTimeFrom] = useState('')
  const [timeTo, setTimeTo] = useState('')
  const [workingIndependently, setWorkingIndependently] = useState('No')
  const [trainingCertificateNo, setTrainingCertificateNo] = useState('')
  const [materialFromLab, setMaterialFromLab] = useState('No')
  const [materialApproxQty, setMaterialApproxQty] = useState('')
  const [materialItemSpecs, setMaterialItemSpecs] = useState({})
  const [materialFilamentMeters, setMaterialFilamentMeters] = useState('')
  const [error, setError] = useState('')
  const [sheetStatus, setSheetStatus] = useState('')
  const [sheetError, setSheetError] = useState('')
  const [sheetResult, setSheetResult] = useState(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [lastAvailabilityKey, setLastAvailabilityKey] = useState('')
  const [nowTick, setNowTick] = useState(0)
  const submitBtnRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30 * 1000)
    return () => clearInterval(id)
  }, [])

  const now = useMemo(() => new Date(), [nowTick])
  const todayStr = toDateInputValue(now)
  const maxDateStr = toDateInputValue(addMonthsClamped(now, 1))
  const nowTimeStr = toTimeInputValue(now)
  const isToday = date === todayStr

  const TIME_STEP_MINUTES = 5

  function onDateChange(nextDate) {
    let safeDate = nextDate
    if (safeDate && todayStr && safeDate < todayStr) safeDate = todayStr
    if (safeDate && maxDateStr && safeDate > maxDateStr) safeDate = maxDateStr
    setDate(safeDate)

    // If user picks today, keep timeFrom/timeTo from going into the past.
    const nextIsToday = safeDate === todayStr
    if (nextIsToday) {
      const nowRounded = ceilTimeToStep(nowTimeStr, TIME_STEP_MINUTES)
      if (timeFrom && timeFrom < nowTimeStr) setTimeFrom(nowRounded)
      if (timeTo && timeTo < nowTimeStr) setTimeTo('')
    }
  }

  function onTimeFromChange(nextFrom) {
    let safeFrom = nextFrom
    if (isToday && safeFrom && safeFrom < nowTimeStr) safeFrom = ceilTimeToStep(nowTimeStr, TIME_STEP_MINUTES)
    setTimeFrom(safeFrom)
    const minTo = safeFrom ? addMinutesToTimeStr(safeFrom, TIME_STEP_MINUTES) : ''
    if (timeTo && minTo && timeTo < minTo) setTimeTo('')
  }

  function onTimeToChange(nextTo) {
    const minTo = timeFrom ? addMinutesToTimeStr(timeFrom, TIME_STEP_MINUTES) : ''
    let safeTo = nextTo
    if (isToday && safeTo && safeTo < nowTimeStr) safeTo = ''
    if (timeFrom && safeTo && minTo && safeTo < minTo) safeTo = ''
    setTimeTo(safeTo)
  }

  const configured = useMemo(() => isConfiguredEntryMap(GOOGLE_FORM_ENTRY), [])
  const appsScriptConfigured = useMemo(() => isConfiguredAppsScript(APPS_SCRIPT_WEB_APP_URL), [])

  const mechanicalConsumableOptions = useMemo(() => {
    const group = TOOL_OPTION_GROUPS.find((g) => /consumables/i.test(String(g?.label || '')))
    return Array.isArray(group?.options) ? group.options : []
  }, [])

  const materialEligibleMachines = useMemo(() => {
    const materialMachinePattern = /(3d printer|laser cutter|cricut|vinyl)/i
    return machines.filter((machine) => materialMachinePattern.test(machine))
  }, [machines])

  const has3DPrinterSelected = useMemo(() => {
    return materialEligibleMachines.some((machine) => /3d printer/i.test(machine))
  }, [materialEligibleMachines])

  const needsMaterialQuestions = materialEligibleMachines.length > 0

  const applicableConsumables = useMemo(() => {
    if (!needsMaterialQuestions) return []

    const wanted = new Set()
    for (const machine of materialEligibleMachines) {
      if (/3d printer/i.test(machine)) {
        for (const item of mechanicalConsumableOptions) {
          if (/3d printer spool/i.test(item)) wanted.add(item)
        }
      }

      if (/laser cutter/i.test(machine)) {
        for (const item of mechanicalConsumableOptions) {
          if (/acrylic sheet|mdf sheet/i.test(item)) wanted.add(item)
        }
      }

      if (/cricut|vinyl/i.test(machine)) {
        for (const item of mechanicalConsumableOptions) {
          if (/vinyl roll/i.test(item)) wanted.add(item)
        }
      }
    }

    return mechanicalConsumableOptions.filter((item) => wanted.has(item))
  }, [needsMaterialQuestions, materialEligibleMachines, mechanicalConsumableOptions])

  const selectedApplicableConsumables = useMemo(() => {
    if (!applicableConsumables.length) return []
    const set = new Set(applicableConsumables)
    return tools.filter((item) => set.has(item))
  }, [applicableConsumables, tools])

  const hasSelectedFilamentConsumable = useMemo(() => {
    return selectedApplicableConsumables.some((item) => materialIsFilament(item))
  }, [selectedApplicableConsumables])

  function materialNeedsArea(item) {
    return /(acrylic|mdf|vinyl)/i.test(String(item || ''))
  }

  function materialIsFilament(item) {
    return /3d printer spool/i.test(String(item || ''))
  }

  function materialNeedsMeters(item) {
    return materialIsFilament(item)
  }

  function normalizeDecimal(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return 0
    return Math.max(0, v)
  }

  function setMaterialSpecForItem(item, key, value) {
    const nextValue = String(value || '').trim()
    setMaterialItemSpecs((prev) => ({
      ...prev,
      [item]: {
        ...(prev[item] || {}),
        [key]: nextValue,
      },
    }))
  }

  function getMaterialSpecForItem(item, key) {
    return String(materialItemSpecs?.[item]?.[key] || '').trim()
  }

  const materialConsumablesSummary = useMemo(() => {
    if (!selectedApplicableConsumables.length) return ''
    return selectedApplicableConsumables
      .map((it) => {
        const qty = normalizeItemQty(itemQty[it] ?? 1) || 1
        const meters = getMaterialSpecForItem(it, 'meters')
        const area = getMaterialSpecForItem(it, 'area')
        const metersPart = materialNeedsMeters(it) && meters ? `, ${meters} m` : ''
        const areaPart = materialNeedsArea(it) && area ? `, ${area} sq.cm` : ''
        return `${it} x${qty}${metersPart}${areaPart}`
      })
      .join(', ')
  }, [selectedApplicableConsumables, itemQty, materialItemSpecs])

  const toolsItemsForTotal = useMemo(() => {
    const out = []
    const seen = new Set()

    const add = (item) => {
      const key = String(item || '').trim()
      if (!key || seen.has(key)) return
      seen.add(key)
      out.push(key)
    }

    if (categories.includes('TOOLS')) {
      for (const it of tools) add(it)
    }
    if (needsMaterialQuestions && materialFromLab === 'Yes') {
      for (const it of selectedApplicableConsumables) add(it)
    }

    return out
  }, [categories, tools, needsMaterialQuestions, materialFromLab, selectedApplicableConsumables])

  const materialConsumablesTotalQty = useMemo(() => {
    if (!selectedApplicableConsumables.length) return 0
    return selectedApplicableConsumables.reduce((sum, it) => sum + (normalizeItemQty(itemQty[it] ?? 1) || 1), 0)
  }, [selectedApplicableConsumables, itemQty])

  const materialFilamentMetersTotal = useMemo(() => {
    if (!selectedApplicableConsumables.length) return 0
    return selectedApplicableConsumables.reduce((sum, it) => {
      if (!materialIsFilament(it)) return sum
      return sum + normalizeDecimal(getMaterialSpecForItem(it, 'meters'))
    }, 0)
  }, [selectedApplicableConsumables, materialItemSpecs])

  useEffect(() => {
    if (needsMaterialQuestions) return
    setMaterialFromLab('No')
    setMaterialApproxQty('')
    setMaterialItemSpecs({})
    setMaterialFilamentMeters('')
  }, [needsMaterialQuestions])

  useEffect(() => {
    if (materialFromLab === 'Yes') return
    setMaterialApproxQty('')
    setMaterialItemSpecs({})
    setMaterialFilamentMeters('')
  }, [materialFromLab])

  useEffect(() => {
    if (hasSelectedFilamentConsumable) return
    setMaterialFilamentMeters('')
  }, [hasSelectedFilamentConsumable])

  useEffect(() => {
    const selected = new Set(selectedApplicableConsumables)
    setMaterialItemSpecs((prev) => {
      const next = {}
      for (const key of Object.keys(prev || {})) {
        if (selected.has(key)) next[key] = prev[key]
      }
      return next
    })
  }, [selectedApplicableConsumables])

  useEffect(() => {
    if (!needsMaterialQuestions || materialFromLab !== 'Yes') return
    setMaterialApproxQty(materialConsumablesSummary)
  }, [needsMaterialQuestions, materialFromLab, materialConsumablesSummary])

  useEffect(() => {
    if (!needsMaterialQuestions || materialFromLab !== 'Yes' || !hasSelectedFilamentConsumable) {
      setMaterialFilamentMeters('')
      return
    }
    const total = materialFilamentMetersTotal
    setMaterialFilamentMeters(total > 0 ? String(Number(total.toFixed(2))) : '')
  }, [needsMaterialQuestions, materialFromLab, hasSelectedFilamentConsumable, materialFilamentMetersTotal])

  const materialRequirementSummary = useMemo(() => {
    if (!needsMaterialQuestions) return 'Not applicable'
    if (materialFromLab !== 'Yes') return 'No'
    const qty = (materialConsumablesSummary || materialApproxQty).trim()
    const filamentMeters = materialFilamentMeters.trim()
    const filamentSuffix = hasSelectedFilamentConsumable && filamentMeters ? `; Filament: ${filamentMeters} m` : ''
    return qty ? `Yes - ${qty}${filamentSuffix}` : `Yes - Quantity not provided${filamentSuffix}`
  }, [needsMaterialQuestions, materialFromLab, materialApproxQty, materialConsumablesSummary, hasSelectedFilamentConsumable, materialFilamentMeters])

  const hasInvalidMaterialSpecs = useMemo(() => {
    if (!needsMaterialQuestions || materialFromLab !== 'Yes') return false
    for (const it of selectedApplicableConsumables) {
      if (materialNeedsMeters(it) && !(normalizeDecimal(getMaterialSpecForItem(it, 'meters')) > 0)) return true
      if (materialNeedsArea(it) && !(normalizeDecimal(getMaterialSpecForItem(it, 'area')) > 0)) return true
    }
    return false
  }, [needsMaterialQuestions, materialFromLab, selectedApplicableConsumables, materialItemSpecs])

  function onApplicableConsumablesChange(nextApplicable) {
    const dedupedApplicable = Array.from(new Set(nextApplicable))
    setTools((prevTools) => {
      const keepOtherTools = prevTools.filter((it) => !applicableConsumables.includes(it))
      return [...keepOtherTools, ...dedupedApplicable]
    })
  }

  function normalizeItemQty(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return 0
    return Math.max(0, Math.floor(v))
  }

  function setQtyForItem(item, qty) {
    const q = normalizeItemQty(qty)
    setItemQty((prev) => ({ ...prev, [item]: q }))
  }

  // Keep itemQty in sync with selected items (only for items where qty matters).
  useEffect(() => {
    const selected = new Set([...electronicComponents, ...powerTools, ...tools])
    setItemQty((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        if (!selected.has(key)) delete next[key]
      }
      for (const key of selected) {
        if (!next[key]) next[key] = 1
      }
      return next
    })
  }, [electronicComponents, powerTools, tools])

  const totalText = useMemo(() => {
    const lines = []

    if (categories.includes('MACHINES') && machines.length) {
      lines.push(`MACHINES: ${machines.map((m) => `${m} x1`).join(', ')}`)
    }

    if (categories.includes('ELECTRONIC COMPONENTS') && electronicComponents.length) {
      lines.push(
        `ELECTRONIC COMPONENTS: ${electronicComponents
          .map((it) => `${it} x${normalizeItemQty(itemQty[it] ?? 1) || 1}`)
          .join(', ')}`
      )
    }

    if (categories.includes('POWER TOOLS') && powerTools.length) {
      lines.push(
        `POWER TOOLS: ${powerTools
          .map((it) => `${it} x${normalizeItemQty(itemQty[it] ?? 1) || 1}`)
          .join(', ')}`
      )
    }

    if (toolsItemsForTotal.length) {
      lines.push(
        `TOOLS / SAFETY / CONSUMABLES: ${toolsItemsForTotal.map((it) => `${it} x${normalizeItemQty(itemQty[it] ?? 1) || 1}`).join(', ')}`
      )
    }

    return lines.join('\n')
  }, [
    categories,
    machines,
    electronicComponents,
    powerTools,
    tools,
    toolsItemsForTotal,
    itemQty,
  ])

  async function callAppsScript({ commit, booking }) {
    const res = await fetch(APPS_SCRIPT_WEB_APP_URL, {
      method: 'POST',
      // Use a simple content-type to avoid preflight in most cases.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ commit, booking }),
    })

    const raw = await res.text()
    let data = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      // If the Apps Script isn't configured/authorized it may return an HTML error page.
      throw new Error(`Apps Script returned ${res.status}. ${raw?.slice?.(0, 180) || ''}`.trim())
    }

    if (!res.ok && data && (data.error || data.message)) {
      throw new Error(String(data.error || data.message))
    }
    return data
  }

  const availabilityKey = useMemo(() => {
    // Key must include anything that affects conflicts / inventory.
    return JSON.stringify({
      date,
      timeFrom,
      timeTo,
      machines,
      electronicComponents,
      powerTools,
      tools,
      itemQty,
    })
  }, [date, timeFrom, timeTo, machines, electronicComponents, powerTools, tools, itemQty])

  const availabilityOk = useMemo(() => {
    if (!appsScriptConfigured) return true
    if (!sheetResult?.ok) return false
    if (lastAvailabilityKey !== availabilityKey) return false
    return true
  }, [appsScriptConfigured, sheetResult, lastAvailabilityKey, availabilityKey])

  async function onCheckAvailability() {
    if (!appsScriptConfigured) return

    setSheetError('')
    setSheetStatus('')
    setSheetResult(null)

    // Validate minimal required fields for check.
    if (!date || !timeFrom || !timeTo) {
      setSheetError('Select date and time slot first.')
      return
    }
    if (todayStr && date < todayStr) {
      setSheetError('Past dates are not allowed.')
      return
    }
    if (maxDateStr && date > maxDateStr) {
      setSheetError('Bookings are allowed only up to 1 month ahead.')
      return
    }
    if (timeFrom >= timeTo) {
      setSheetError('Invalid time slot (From must be earlier than To).')
      return
    }
    if (!categories.length || (categories.includes(NONE_CATEGORY) && categories.length > 1)) {
      setSheetError('Select a valid category first.')
      return
    }
    for (const sec of itemSections) {
      if (!sec.value.length) {
        setSheetError('Select required items for the chosen categories.')
        return
      }
    }
    if (needsMaterialQuestions && materialFromLab === 'Yes' && !selectedApplicableConsumables.length) {
      setSheetError('Select applicable consumables and quantity when taking material from lab.')
      return
    }
    if (needsMaterialQuestions && materialFromLab === 'Yes' && hasInvalidMaterialSpecs) {
      setSheetError('Enter meters only for filament materials and area for acrylic/MDF/vinyl materials.')
      return
    }
    if (needsMaterialQuestions && materialFromLab === 'Yes' && hasSelectedFilamentConsumable && !(Number(materialFilamentMeters) > 0)) {
      setSheetError('Enter filament quantity in meters only for selected filament consumables.')
      return
    }

    const bookingForCheck = {
      name: name.trim(),
      ktuId: ktuId.trim(),
      phone: phone.trim(),
      email: email.trim(),
      semester,
      department,
      purpose: purpose.trim(),
      categories,
      machines,
      date,
      timeFrom,
      timeTo,
      itemQty,
      totalText,
      workingIndependently,
      trainingCertificateNo: trainingCertificateNo.trim(),
      materialFromLab: needsMaterialQuestions ? materialFromLab : 'No',
      materialApproxQty: needsMaterialQuestions && materialFromLab === 'Yes' ? materialConsumablesSummary.trim() : '',
      materialFilamentMeters: needsMaterialQuestions && materialFromLab === 'Yes' && hasSelectedFilamentConsumable ? String(materialFilamentMeters).trim() : '',
      materialRequirementSummary,
    }

    setCheckingAvailability(true)
    setSheetStatus('Checking availability…')

    try {
      const data = await callAppsScript({ commit: false, booking: bookingForCheck })
      setSheetResult(data)
      setLastAvailabilityKey(availabilityKey)
      setSheetStatus(data?.ok ? 'Available' : '')
      setSheetError(data?.ok ? '' : String(data?.error || 'Not available'))
    } catch (err) {
      setSheetResult(null)
      setLastAvailabilityKey('')
      setSheetStatus('')
      setSheetError(String(err?.message || err || 'Failed to check availability'))
    } finally {
      setCheckingAvailability(false)
    }
  }

  function clearCategoryItems(category) {
    if (category === 'MACHINES') setMachines([])
    if (category === 'ELECTRONIC COMPONENTS') setElectronicComponents([])
    if (category === 'POWER TOOLS') setPowerTools([])
    if (category === 'TOOLS') setTools([])
  }

  function onCategoriesChange(next) {
    const prev = categories

    const added = next.filter((c) => !prev.includes(c))

    // NONE is mutually exclusive with real categories.
    // If user just selected NONE, keep only NONE.
    // If user selected a real category while NONE was selected, drop NONE.
    const hasNone = next.includes(NONE_CATEGORY)
    const hasReal = next.some((c) => c !== NONE_CATEGORY)
    if (hasNone && hasReal) {
      if (added.includes(NONE_CATEGORY)) {
        next = [NONE_CATEGORY]
      } else {
        next = next.filter((c) => c !== NONE_CATEGORY)
      }
    }

    setCategories(next)

    const removed = prev.filter((c) => !next.includes(c))
    for (const r of removed) clearCategoryItems(r)

    if (next.includes(NONE_CATEGORY)) {
      clearCategoryItems('MACHINES')
      clearCategoryItems('ELECTRONIC COMPONENTS')
      clearCategoryItems('POWER TOOLS')
      clearCategoryItems('TOOLS')
    }
  }

  const itemSections = useMemo(() => {
    return categories
      .filter((c) => c !== NONE_CATEGORY)
      .map((c) => {
        if (c === 'MACHINES')
          return { key: c, label: 'MACHINES', options: MACHINE_OPTION_GROUPS, value: machines, onChange: setMachines }
        if (c === 'ELECTRONIC COMPONENTS')
          return {
            key: c,
            label: 'ELECTRONIC COMPONENTS',
            options: ELECTRONIC_COMPONENT_OPTION_GROUPS,
            value: electronicComponents,
            onChange: setElectronicComponents,
          }
        if (c === 'POWER TOOLS')
          return { key: c, label: 'POWER TOOLS', options: POWER_TOOL_OPTION_GROUPS, value: powerTools, onChange: setPowerTools }
        return {
          key: c,
          label: 'TOOLS / SAFETY / CONSUMABLES',
          options: TOOL_OPTION_GROUPS,
          value: tools,
          onChange: setTools,
        }
      })
  }, [categories, machines, electronicComponents, powerTools, tools])

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (!ktuId.trim()) return false
    if (!phone.trim()) return false
    if (!email.trim()) return false
    if (!semester) return false
    if (!department) return false
    if (!categories.length) return false
    if (categories.includes(NONE_CATEGORY) && categories.length > 1) return false
    if (!date) return false
    if (todayStr && date < todayStr) return false
    if (maxDateStr && date > maxDateStr) return false
    if (!timeFrom) return false
    if (!timeTo) return false
    if (!purpose.trim()) return false
    for (const sec of itemSections) {
      if (!sec.value.length) return false
    }

    // Quantity is required for electronic components / tools / power tools.
    for (const it of electronicComponents) {
      if (normalizeItemQty(itemQty[it]) < 1) return false
      const limit = sheetResult?.inventoryLeft?.[it]
      const total = INVENTORY_QTY[it]
      const available = Number.isFinite(limit) ? limit : Number.isFinite(total) ? total : null
      if (available !== null && normalizeItemQty(itemQty[it]) > available) return false
    }
    for (const it of powerTools) {
      if (normalizeItemQty(itemQty[it]) < 1) return false
      const limit = sheetResult?.inventoryLeft?.[it]
      const total = INVENTORY_QTY[it]
      const available = Number.isFinite(limit) ? limit : Number.isFinite(total) ? total : null
      if (available !== null && normalizeItemQty(itemQty[it]) > available) return false
    }
    for (const it of tools) {
      if (normalizeItemQty(itemQty[it]) < 1) return false
      const limit = sheetResult?.inventoryLeft?.[it]
      const total = INVENTORY_QTY[it]
      const available = Number.isFinite(limit) ? limit : Number.isFinite(total) ? total : null
      if (available !== null && normalizeItemQty(itemQty[it]) > available) return false
    }

    if (needsMaterialQuestions && materialFromLab === 'Yes' && !selectedApplicableConsumables.length) return false
    if (needsMaterialQuestions && materialFromLab === 'Yes' && hasInvalidMaterialSpecs) return false
    if (needsMaterialQuestions && materialFromLab === 'Yes' && !materialConsumablesSummary.trim()) return false
    if (needsMaterialQuestions && materialFromLab === 'Yes' && hasSelectedFilamentConsumable && !(Number(materialFilamentMeters) > 0)) return false

    if (workingIndependently === 'Yes' && !trainingCertificateNo.trim()) return false

    // Basic time range check (string compare works for HH:MM)
    if (timeFrom >= timeTo) return false
    // If Apps Script is enabled, require a successful availability check for the current selection.
    if (appsScriptConfigured && !availabilityOk) return false
    return true
  }, [
    name,
    ktuId,
    phone,
    email,
    semester,
    department,
    date,
    todayStr,
    maxDateStr,
    timeFrom,
    timeTo,
    purpose,
    categories,
    itemSections,
    electronicComponents,
    powerTools,
    tools,
    itemQty,
    needsMaterialQuestions,
    materialFromLab,
    materialApproxQty,
    materialItemSpecs,
    materialFilamentMeters,
    hasInvalidMaterialSpecs,
    hasSelectedFilamentConsumable,
    selectedApplicableConsumables,
    materialConsumablesSummary,
    sheetResult,
    workingIndependently,
    trainingCertificateNo,
    appsScriptConfigured,
    availabilityOk,
  ])

  function onClearSheet() {
    setError('')
    setSheetStatus('')
    setSheetError('')
    setSheetResult(null)

    setName('')
    setKtuId('')
    setPhone('')
    setEmail('')
    setSemester('')
    setDepartment('')
    setPurpose('')

    setCategories([])
    setMachines([])
    setElectronicComponents([])
    setPowerTools([])
    setTools([])
    setItemQty({})
    setDate('')
    setTimeFrom('')
    setTimeTo('')
    setWorkingIndependently('No')
    setTrainingCertificateNo('')
    setMaterialFromLab('No')
    setMaterialApproxQty('')
    setMaterialItemSpecs({})
    setMaterialFilamentMeters('')
  }

  function showSubmitPopup(targetEmail) {
    const mail = String(targetEmail || '').trim()
    const line = mail ? `The request is mailed to ${mail}.` : 'The request is mailed to the entered email ID.'
    window.alert(`Request submitted successfully.\n${line}`)
  }

  function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSheetError('')
    setSheetStatus('')

    if (!canSubmit) {
      setError('Please fill all required fields (and ensure From < To).')
      return
    }

    const booking = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: name.trim(),
      ktuId: ktuId.trim(),
      phone: phone.trim(),
      email: email.trim(),
      semester,
      department,
      purpose: purpose.trim(),
      categories,
      machines,
      electronicComponents,
      powerTools,
      tools,
      itemQty,
      totalText,
      date,
      timeFrom,
      timeTo,
      workingIndependently,
      trainingCertificateNo: trainingCertificateNo.trim(),
      materialFromLab: needsMaterialQuestions ? materialFromLab : 'No',
      materialApproxQty: needsMaterialQuestions && materialFromLab === 'Yes' ? materialConsumablesSummary.trim() : '',
      materialFilamentMeters: needsMaterialQuestions && materialFromLab === 'Yes' && hasSelectedFilamentConsumable ? String(materialFilamentMeters).trim() : '',
      materialRequirementSummary,
      createdAt: new Date().toISOString(),
    }

    // 1) Apps Script commit (fills Bookings sheet automatically)
    const commitPromise = appsScriptConfigured
      ? (async () => {
        setSheetStatus('Checking & reserving…')
        try {
          const resp = await callAppsScript({ commit: true, booking })
          setSheetResult(resp)

          if (!resp?.ok) {
            setSheetStatus('')
            setSheetError(String(resp?.error || 'Conflict detected. Please adjust your selection/time slot.'))
            return { ok: false, resp, appsScriptOk: true }
          }

          setSheetStatus('Stored in Bookings sheet.')
          setSheetError('')
          return { ok: true, resp, appsScriptOk: true }
        } catch (err) {
          // Don't block Google Form submission if Apps Script is down/misconfigured.
          setSheetStatus('')
          setSheetResult(null)
          setSheetError(String(err?.message || err || 'Failed to store/check booking'))
          return { ok: true, resp: null, appsScriptOk: false }
        }
      })()
      : Promise.resolve({ ok: true, resp: null })

    commitPromise
      .then(({ ok, appsScriptOk }) => {
        if (!ok) return

        // Single-source write path: when Apps Script is configured, do NOT also
        // submit to Google Form, otherwise the same booking can be processed twice.
        if (appsScriptConfigured) {
          if (!appsScriptOk) {
            setError('Apps Script save failed. Google Form fallback is disabled to prevent duplicate bookings.')
            submitBtnRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
            return
          }
          showSubmitPopup(booking.email)
          onClearSheet()
          return
        }

        // 2) Google Form submit (only when Apps Script is not configured)
        if (!configured) {
          setError(
            'Google Form submission is not configured yet. Send me the Google Form prefilled link and I will map the entry IDs.'
          )
          submitBtnRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
          return
        }

        // Build payload
        const params = new URLSearchParams()
        if (GOOGLE_FORM_ENTRY.name) params.set(`entry.${GOOGLE_FORM_ENTRY.name}`, booking.name)
        if (GOOGLE_FORM_ENTRY.ktuId) params.set(`entry.${GOOGLE_FORM_ENTRY.ktuId}`, booking.ktuId)
        if (GOOGLE_FORM_ENTRY.phone) params.set(`entry.${GOOGLE_FORM_ENTRY.phone}`, booking.phone)
        if (GOOGLE_FORM_ENTRY.email) params.set(`entry.${GOOGLE_FORM_ENTRY.email}`, booking.email)
        if (GOOGLE_FORM_ENTRY.semester) params.set(`entry.${GOOGLE_FORM_ENTRY.semester}`, booking.semester)
        if (GOOGLE_FORM_ENTRY.department) params.set(`entry.${GOOGLE_FORM_ENTRY.department}`, booking.department)
        if (GOOGLE_FORM_ENTRY.purpose) params.set(`entry.${GOOGLE_FORM_ENTRY.purpose}`, booking.purpose)
        // Category is a checkbox question (multi-select)
        multiValueParams(params, GOOGLE_FORM_ENTRY.category, booking.categories)

        // Checkbox groups for each category list
        if (booking.categories.includes('MACHINES')) multiValueParams(params, GOOGLE_FORM_ENTRY.machines, booking.machines)
        // NOTE: You said you will change these Google Form questions to Long answer.
        // So we submit a single comma-separated string instead of checkbox multi-values.
        if (booking.categories.includes('ELECTRONIC COMPONENTS') && GOOGLE_FORM_ENTRY.electronicComponents) {
          params.set(`entry.${GOOGLE_FORM_ENTRY.electronicComponents}`, booking.electronicComponents.join(', '))
        }
        if (booking.categories.includes('POWER TOOLS') && GOOGLE_FORM_ENTRY.powerTools) {
          params.set(`entry.${GOOGLE_FORM_ENTRY.powerTools}`, booking.powerTools.join(', '))
        }
        if (booking.categories.includes('TOOLS') && GOOGLE_FORM_ENTRY.tools) {
          params.set(`entry.${GOOGLE_FORM_ENTRY.tools}`, booking.tools.join(', '))
        }

        if (GOOGLE_FORM_ENTRY.materialFromLab) {
          params.set(`entry.${GOOGLE_FORM_ENTRY.materialFromLab}`, booking.materialFromLab)
        }
        if (GOOGLE_FORM_ENTRY.materialApproxQty) {
          params.set(`entry.${GOOGLE_FORM_ENTRY.materialApproxQty}`, booking.materialApproxQty)
        }
        if (GOOGLE_FORM_ENTRY.materialFilamentMeters) {
          params.set(`entry.${GOOGLE_FORM_ENTRY.materialFilamentMeters}`, booking.materialFilamentMeters)
        }

        // Long-answer summary with quantities
        if (GOOGLE_FORM_ENTRY.total) params.set(`entry.${GOOGLE_FORM_ENTRY.total}`, booking.totalText)
        // Google date inputs accept yyyy-mm-dd
        if (GOOGLE_FORM_ENTRY.date) params.set(`entry.${GOOGLE_FORM_ENTRY.date}`, booking.date)
        if (GOOGLE_FORM_ENTRY.timeFrom) params.set(`entry.${GOOGLE_FORM_ENTRY.timeFrom}`, booking.timeFrom)
        if (GOOGLE_FORM_ENTRY.timeTo) params.set(`entry.${GOOGLE_FORM_ENTRY.timeTo}`, booking.timeTo)
        if (GOOGLE_FORM_ENTRY.workingIndependently) {
          const independentAnswer =
            booking.workingIndependently === 'Yes'
              ? `Yes, Training certificate no: ${booking.trainingCertificateNo}`
              : 'No'
          params.set(`entry.${GOOGLE_FORM_ENTRY.workingIndependently}`, independentAnswer)
        }

        submitToGoogleForm({
          payload: params,
          onDone: () => {
            showSubmitPopup(booking.email)
            onClearSheet()
          },
        })
      })
      .catch((err) => {
        setSheetStatus('')
        setSheetError(String(err?.message || err || 'Failed to store/check booking'))
      })

    return

  }

  return (
    <div className="sectionStack">
      <header className="pageHeader">
        <h1 className="pageTitle">Slot Booking</h1>
        <p className="pageSubtitle">Book lab time slots and submit the request to the TL GECI.</p>
      </header>

      <section className="card" style={{ padding: '1.4rem' }}>
        <div className="grid cols-2" style={{ alignItems: 'start' }}>
          <form onSubmit={onSubmit} className="card" style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              <div>
                <label className="label">Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>

              <div>
                <label className="label">KTU ID</label>
                <input className="input" value={ktuId} onChange={(e) => setKtuId(e.target.value)} placeholder="KTU ID" />
              </div>

              <div>
                <label className="label">Phone No</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
              </div>

              <div>
                <label className="label">Email ID</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid cols-2" style={{ gap: '0.85rem' }}>
                <div>
                  <label className="label">Semester</label>
                  <select className="input" value={semester} onChange={(e) => setSemester(e.target.value)}>
                    <option value="" disabled>
                      Select semester
                    </option>
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Department</label>
                  <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="" disabled>
                      Select department
                    </option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Purpose / project description (brief)</label>
                <textarea
                  className="input"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe what you want to do"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="label">Category</label>
                <div className="card" style={{ padding: '0.85rem' }}>
                  <div style={{ display: 'grid', gap: '0.45rem' }}>
                    {CATEGORIES.map((c) => {
                      const checked = categories.includes(c)
                      const displayCategory = c === 'TOOLS' ? 'TOOLS / SAFETY / CONSUMABLES' : c
                      return (
                        <label
                          key={c}
                          style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', color: 'rgba(255, 255, 255, 0.82)' }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) onCategoriesChange([...categories, c])
                              else onCategoriesChange(categories.filter((x) => x !== c))
                            }}
                          />
                          <span>{displayCategory}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ marginTop: '0.55rem', color: 'rgba(255, 255, 255, 0.62)', fontSize: '0.92rem' }}>
                    Select at least one (choose NONE if not applicable)
                  </div>
                </div>
              </div>

              {itemSections.map((sec) => (
                <div key={sec.key} className="card" style={{ padding: '0.9rem' }}>
                  <div style={{ fontWeight: 800, marginBottom: '0.55rem' }}>{sec.label}</div>
                  <SearchMultiSelectDropdown
                    value={sec.value}
                    options={sec.options}
                    onChange={sec.onChange}
                    placeholder={`Select ${sec.label.toLowerCase()}…`}
                    searchPlaceholder={`Search ${sec.label.toLowerCase()}…`}
                  />

                  {sec.value.length ? (
                    sec.key === 'ELECTRONIC COMPONENTS' || sec.key === 'POWER TOOLS' || sec.key === 'TOOLS' ? (
                      <div style={{ marginTop: '0.65rem', display: 'grid', gap: '0.55rem' }}>
                        {sec.value.map((it) => {
                          const left = sheetResult?.inventoryLeft?.[it]
                          const total = INVENTORY_QTY[it]
                          const maxQty = Number.isFinite(left) ? left : Number.isFinite(total) ? total : undefined

                          return (
                            <div
                              key={it}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 110px',
                                gap: '0.65rem',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ lineHeight: 1.4 }}>
                                <div style={{ color: 'rgba(255, 255, 255, 0.80)' }}>{it}</div>
                                {Number.isFinite(left) ? (
                                  <div style={{ marginTop: '0.2rem', color: 'rgba(255, 255, 255, 0.62)', fontSize: '0.85rem' }}>
                                    Left: {left}
                                  </div>
                                ) : Number.isFinite(total) ? (
                                  <div style={{ marginTop: '0.2rem', color: 'rgba(255, 255, 255, 0.62)', fontSize: '0.85rem' }}>
                                    Total: {total}
                                  </div>
                                ) : null}
                              </div>

                              <input
                                className="input"
                                type="number"
                                min={1}
                                max={maxQty}
                                step={1}
                                value={normalizeItemQty(itemQty[it] ?? 1) || 1}
                                onChange={(e) => setQtyForItem(it, e.target.value)}
                                placeholder="Qty"
                                aria-label={`${it} quantity`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ marginTop: '0.55rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.5 }}>
                        {sec.value.join(', ')}
                      </div>
                    )
                  ) : (
                    <div style={{ marginTop: '0.55rem', color: 'rgba(255, 255, 255, 0.55)' }}>Select at least one</div>
                  )}
                </div>
              ))}

              {needsMaterialQuestions ? (
                <div className="card" style={{ padding: '0.9rem' }}>
                  <div style={{ fontWeight: 800, marginBottom: '0.55rem' }}>Material requirement (for selected machines)</div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '0.9rem', marginBottom: '0.65rem' }}>
                    Applicable for: {materialEligibleMachines.join(', ')}
                  </div>

                  <div style={{ display: 'grid', gap: '0.7rem' }}>
                    <div>
                      <label className="label">Is material taken from the lab?</label>
                      <select className="input" value={materialFromLab} onChange={(e) => setMaterialFromLab(e.target.value)}>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {materialFromLab === 'Yes' ? (
                      <>
                        <div>
                          <label className="label">Select applicable consumables</label>
                          <SearchMultiSelectDropdown
                            value={selectedApplicableConsumables}
                            options={[{ label: 'Applicable Consumables', options: applicableConsumables }]}
                            onChange={onApplicableConsumablesChange}
                            placeholder="Select consumables…"
                            searchPlaceholder="Search consumables…"
                          />
                          <div style={{ marginTop: '0.4rem', color: 'rgba(255, 255, 255, 0.62)', fontSize: '0.85rem' }}>
                            If already chosen in TOOLS / SAFETY / CONSUMABLES, no need to select again.
                          </div>
                        </div>

                        {selectedApplicableConsumables.length ? (
                          <div style={{ display: 'grid', gap: '0.55rem' }}>
                            {selectedApplicableConsumables.map((it) => {
                              const left = sheetResult?.inventoryLeft?.[it]
                              const total = INVENTORY_QTY[it]
                              const maxQty = Number.isFinite(left) ? left : Number.isFinite(total) ? total : undefined
                              const metersValue = getMaterialSpecForItem(it, 'meters')
                              const areaValue = getMaterialSpecForItem(it, 'area')
                              const showArea = materialNeedsArea(it)
                              const showMeters = materialNeedsMeters(it)

                              return (
                                <div
                                  key={`material_${it}`}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: showArea && showMeters
                                      ? '1fr 92px 120px 120px'
                                      : showArea || showMeters
                                        ? '1fr 92px 120px'
                                        : '1fr 92px',
                                    gap: '0.65rem',
                                    alignItems: 'center',
                                  }}
                                >
                                  <div style={{ lineHeight: 1.4, color: 'rgba(255, 255, 255, 0.80)' }}>{it}</div>
                                  <input
                                    className="input"
                                    type="number"
                                    min={1}
                                    max={maxQty}
                                    step={1}
                                    value={normalizeItemQty(itemQty[it] ?? 1) || 1}
                                    onChange={(e) => setQtyForItem(it, e.target.value)}
                                    placeholder="Qty"
                                    aria-label={`${it} quantity`}
                                  />
                                  {showMeters ? (
                                    <input
                                      className="input"
                                      type="number"
                                      min={0.1}
                                      step={0.1}
                                      value={metersValue}
                                      onChange={(e) => setMaterialSpecForItem(it, 'meters', e.target.value)}
                                      placeholder="Meters"
                                      aria-label={`${it} meters required`}
                                    />
                                  ) : null}
                                  {showArea ? (
                                    <input
                                      className="input"
                                      type="number"
                                      min={0.1}
                                      step={0.1}
                                      value={areaValue}
                                      onChange={(e) => setMaterialSpecForItem(it, 'area', e.target.value)}
                                      placeholder="Area (sq.cm)"
                                      aria-label={`${it} area required in square centimeters`}
                                    />
                                  ) : null}
                                </div>
                              )
                            })}
                            <div style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.88rem' }}>
                              Fill meters only for filament materials. For acrylic/MDF/vinyl materials, fill area.
                            </div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.88rem' }}>
                              Synced total consumables quantity: {materialConsumablesTotalQty}
                            </div>
                            {hasSelectedFilamentConsumable ? (
                              <div style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.88rem' }}>
                                Total filament from selected spool materials: {materialFilamentMeters || '0'} m
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div style={{ color: 'rgba(255, 120, 120, 0.85)', fontSize: '0.88rem' }}>
                            Select at least one consumable when taking material from lab.
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div>
                <label className="label">TOTAL (auto-generated)</label>
                <textarea className="input" value={totalText} readOnly rows={4} style={{ resize: 'vertical', opacity: 0.95 }} />
                <div style={{ marginTop: '0.45rem', color: 'rgba(255, 255, 255, 0.62)', fontSize: '0.92rem' }}>
                </div>
              </div>

              <div>
                <label className="label">Date of using lab facilities</label>
                <CustomDatePicker value={date} onChange={onDateChange} minDate={todayStr} maxDate={maxDateStr} />
              </div>

              <div className="grid cols-2" style={{ gap: '0.85rem' }}>
                <div>
                  <label className="label">Time slot - From</label>
                  <CustomTimePicker
                    value={timeFrom}
                    onChange={onTimeFromChange}
                    minTime={isToday ? nowTimeStr : ''}
                    stepMinutes={5}
                    placeholder="Select time"
                  />
                </div>

                <div>
                  <label className="label">Time slot - To</label>
                  <CustomTimePicker
                    value={timeTo}
                    onChange={onTimeToChange}
                    minTime={timeFrom ? addMinutesToTimeStr(timeFrom, 5) : isToday ? nowTimeStr : ''}
                    stepMinutes={5}
                    placeholder="Select time"
                  />
                </div>
              </div>

              <div>
                <label className="label">Working Independently (Yes/No)</label>
                <select className="input" value={workingIndependently} onChange={(e) => setWorkingIndependently(e.target.value)}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {workingIndependently === 'Yes' ? (
                <div>
                  <label className="label">Training certificate no</label>
                  <input
                    className="input"
                    value={trainingCertificateNo}
                    onChange={(e) => setTrainingCertificateNo(e.target.value)}
                    placeholder="Certificate number"
                  />
                </div>
              ) : null}

              {error ? (
                <div className="card" style={{ padding: '0.75rem 0.9rem', borderColor: 'rgba(255, 120, 120, 0.55)' }}>
                  {error}
                </div>
              ) : null}

              {appsScriptConfigured ? (
                sheetError || sheetStatus || sheetResult?.conflicts?.length ? (
                  <div className="card" style={{ padding: '0.75rem 0.9rem', borderColor: 'rgba(255, 255, 255, 0.16)' }}>
                    <div style={{ fontWeight: 800, marginBottom: '0.35rem' }}>Availability check</div>
                    {sheetStatus ? <div style={{ color: 'rgba(255, 255, 255, 0.75)' }}>{sheetStatus}</div> : null}
                    {sheetError ? (
                      <div style={{ marginTop: '0.35rem', color: 'rgba(255, 120, 120, 0.85)' }}>{sheetError}</div>
                    ) : null}

                    {Array.isArray(sheetResult?.conflicts) && sheetResult.conflicts.length ? (
                      <div style={{ marginTop: '0.55rem', display: 'grid', gap: '0.35rem' }}>
                        <div style={{ color: 'rgba(255, 120, 120, 0.95)', fontWeight: 700 }}>Conflicts</div>
                        {sheetResult.conflicts.map((c, idx) => (
                          <div key={idx} style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: '0.92rem', lineHeight: 1.45 }}>
                            {c.kind === 'machine'
                              ? `${c.item} is already booked (${c.existing?.from}–${c.existing?.to})` +
                              (c.existing?.name ? ` by ${c.existing.name}` : '')
                              : `${c.item}: needed ${c.needed}, left ${c.left}`}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {Array.isArray(sheetResult?.warnings) && sheetResult.warnings.length ? (
                      <div style={{ marginTop: '0.55rem', display: 'grid', gap: '0.35rem' }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 700 }}>Warnings</div>
                        {sheetResult.warnings.slice(0, 8).map((w, idx) => (
                          <div key={idx} style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.9rem', lineHeight: 1.45 }}>
                            {w.kind === 'missingInventory' ? `Not found in Inventory sheet: ${w.item}` : JSON.stringify(w)}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {sheetResult?.suggestions && Object.keys(sheetResult.suggestions).length ? (
                      <div style={{ marginTop: '0.55rem', display: 'grid', gap: '0.3rem' }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontWeight: 700 }}>Next free slot suggestions</div>
                        {Object.entries(sheetResult.suggestions).map(([machine, s]) => (
                          <div key={machine} style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: '0.92rem' }}>
                            {machine}: {s.from} → {s.to}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null
              ) : null}

              {appsScriptConfigured ? (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={onCheckAvailability}
                    disabled={checkingAvailability}
                    style={{ opacity: checkingAvailability ? 0.65 : 0.95, flex: '1 1 auto' }}
                  >
                    {checkingAvailability ? 'Checking…' : 'Check Availability / Refresh'}
                  </button>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button type="button" className="btn" onClick={onClearSheet} style={{ opacity: 0.9 }}>
                  Clear Sheet
                </button>
                <button
                  ref={submitBtnRef}
                  className="btn"
                  type="submit"
                  disabled={!canSubmit}
                  style={{ opacity: canSubmit ? 1 : 0.55, flex: '1 1 auto' }}
                >
                  Submit Booking
                </button>
              </div>

              {appsScriptConfigured && !availabilityOk ? (
                <div style={{ color: 'rgba(255, 255, 255, 0.62)', fontSize: '0.92rem' }}>
                  Check availability to enable submission.
                </div>
              ) : null}

              {!configured ? (
                <a
                  href={GOOGLE_FORM_VIEW_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.92rem' }}
                >
                  Open the Google Form
                </a>
              ) : null}
            </div>
          </form>

          <div className="card" style={{ padding: '1rem' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.05rem' }}>Lab schedule</h2>
            {GOOGLE_CALENDAR_EMBED_URL ? (
              <iframe
                title="Lab schedule calendar"
                src={GOOGLE_CALENDAR_EMBED_URL}
                style={{
                  width: '100%',
                  height: 620,
                  border: 0,
                  borderRadius: 10,
                  colorScheme: 'light',
                  filter: 'invert(1) hue-rotate(180deg) contrast(0.85) brightness(0.9)'
                }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <p style={{ marginTop: 0, color: 'rgba(255, 255, 255, 0.70)', lineHeight: 1.5 }}>
                Calendar is not configured yet. Set <b>GOOGLE_CALENDAR_EMBED_URL</b> in this file to your Google Calendar embed link.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
