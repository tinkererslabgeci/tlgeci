/**
 * TL GECI Availability API (separate Apps Script project)
 *
 * Deploy this as a NEW Web App project to avoid touching existing booking script.
 *
 * Required script property:
 * - SPREADSHEET_ID: Google Sheet id that contains Bookings tab
 *
 * Optional script property:
 * - BOOKINGS_SHEET_NAME (default: "Bookings")
 *
 * Request (GET):
 *   ?action=availability&machine=Laser%20Cutter&date=2026-03-25&timeFrom=14:00&timeTo=16:00
 *
 * Response:
 *   {
 *     ok: true,
 *     available: true,
 *     machine: "Laser Cutter",
 *     date: "2026-03-25",
 *     timeFrom: "14:00",
 *     timeTo: "16:00",
 *     suggestions: [{ date, timeFrom, timeTo }]
 *   }
 */

const DEFAULT_BOOKINGS_SHEET_NAME = 'Bookings'

function doGet(e) {
  try {
    const params = (e && e.parameter) || {}
    const action = String(params.action || 'availability').trim()

    if (action !== 'availability') {
      return jsonOut_({ ok: false, error: 'Unknown action' })
    }

    const machine = String(params.machine || '').trim()
    const date = String(params.date || '').trim()
    const timeFrom = String(params.timeFrom || '').trim()
    const timeTo = String(params.timeTo || '').trim()

    if (!machine || !date || !timeFrom || !timeTo) {
      return jsonOut_({ ok: false, error: 'machine, date, timeFrom and timeTo are required' })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonOut_({ ok: false, error: 'date must be YYYY-MM-DD' })
    }

    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeFrom) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeTo)) {
      return jsonOut_({ ok: false, error: 'timeFrom/timeTo must be HH:MM' })
    }

    if (toMinutes_(timeFrom) >= toMinutes_(timeTo)) {
      return jsonOut_({ ok: false, error: 'timeFrom must be before timeTo' })
    }

    const result = checkMachineAvailability_({ machine, date, timeFrom, timeTo })
    return jsonOut_(result)
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) })
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

function getSpreadsheetId_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) throw new Error('SPREADSHEET_ID is not configured in Script Properties')
  return id
}

function getBookingsSheetName_() {
  return String(PropertiesService.getScriptProperties().getProperty('BOOKINGS_SHEET_NAME') || DEFAULT_BOOKINGS_SHEET_NAME).trim()
}

function checkMachineAvailability_(req) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId_())
  const sh = ss.getSheetByName(getBookingsSheetName_())
  if (!sh) throw new Error('Bookings sheet not found')
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Kolkata'

  const values = sh.getDataRange().getValues()
  if (!values || values.length < 2) {
    return {
      ok: true,
      available: true,
      machine: req.machine,
      date: req.date,
      timeFrom: req.timeFrom,
      timeTo: req.timeTo,
      conflicts: [],
      suggestions: [],
    }
  }

  const header = values[0].map(function (h) { return String(h || '').trim() })
  const idxDate = header.indexOf('Date')
  const idxFrom = header.indexOf('TimeFrom')
  const idxTo = header.indexOf('TimeTo')
  const idxMachines = header.indexOf('Machines')
  const idxStatus = header.indexOf('Status')

  if (idxDate < 0 || idxFrom < 0 || idxTo < 0 || idxMachines < 0) {
    throw new Error('Bookings sheet header must include Date, TimeFrom, TimeTo, Machines')
  }

  const reqStart = toMinutes_(req.timeFrom)
  const reqEnd = toMinutes_(req.timeTo)

  var conflicts = []
  for (var r = 1; r < values.length; r++) {
    const row = values[r]
    const rowDate = normalizeDateCell_(row[idxDate], tz)
    if (rowDate !== req.date) continue

    if (idxStatus >= 0) {
      const status = String(row[idxStatus] || '').trim().toLowerCase()
      if (status === 'cancelled' || status === 'canceled' || status === 'rejected') continue
    }

    const rowFrom = normalizeTimeCell_(row[idxFrom])
    const rowTo = normalizeTimeCell_(row[idxTo])
    if (!rowFrom || !rowTo) continue

    const machineList = String(row[idxMachines] || '')
      .split(',')
      .map(function (m) { return String(m || '').trim().toLowerCase() })
      .filter(function (m) { return m })

    if (machineList.indexOf(req.machine.toLowerCase()) < 0) continue

    const rowStart = toMinutes_(rowFrom)
    const rowEnd = toMinutes_(rowTo)

    const overlaps = reqStart < rowEnd && reqEnd > rowStart
    if (overlaps) {
      conflicts.push({ date: rowDate, timeFrom: rowFrom, timeTo: rowTo, machine: req.machine })
    }
  }

  const available = conflicts.length === 0
  return {
    ok: true,
    available: available,
    machine: req.machine,
    date: req.date,
    timeFrom: req.timeFrom,
    timeTo: req.timeTo,
    conflicts: conflicts,
    suggestions: available ? [] : suggestSlots_(req.date, req.machine, values, idxDate, idxFrom, idxTo, idxMachines, idxStatus, reqEnd - reqStart, tz),
  }
}

function suggestSlots_(dateStr, machine, values, idxDate, idxFrom, idxTo, idxMachines, idxStatus, durationMinutes, tz) {
  const openMin = 8 * 60
  const closeMin = 22 * 60
  const step = 30
  var suggestions = []

  for (var start = openMin; start + durationMinutes <= closeMin; start += step) {
    const end = start + durationMinutes
    var blocked = false

    for (var r = 1; r < values.length; r++) {
      const row = values[r]
      const rowDate = normalizeDateCell_(row[idxDate], tz)
      if (rowDate !== dateStr) continue

      if (idxStatus >= 0) {
        const status = String(row[idxStatus] || '').trim().toLowerCase()
        if (status === 'cancelled' || status === 'canceled' || status === 'rejected') continue
      }

      const machineList = String(row[idxMachines] || '')
        .split(',')
        .map(function (m) { return String(m || '').trim().toLowerCase() })
        .filter(function (m) { return m })
      if (machineList.indexOf(String(machine || '').toLowerCase()) < 0) continue

      const rowFrom = normalizeTimeCell_(row[idxFrom])
      const rowTo = normalizeTimeCell_(row[idxTo])
      if (!rowFrom || !rowTo) continue

      const rowStart = toMinutes_(rowFrom)
      const rowEnd = toMinutes_(rowTo)
      if (start < rowEnd && end > rowStart) {
        blocked = true
        break
      }
    }

    if (!blocked) {
      suggestions.push({
        date: dateStr,
        timeFrom: fromMinutes_(start),
        timeTo: fromMinutes_(end),
      })
      if (suggestions.length >= 3) break
    }
  }

  return suggestions
}

function toMinutes_(timeStr) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(timeStr || '').trim())
  if (!m) return 0
  return Number(m[1]) * 60 + Number(m[2])
}

function fromMinutes_(n) {
  var t = Math.max(0, Math.min(1439, Number(n) || 0))
  var hh = Math.floor(t / 60)
  var mm = t % 60
  return (hh < 10 ? '0' + hh : String(hh)) + ':' + (mm < 10 ? '0' + mm : String(mm))
}

function normalizeTime_(value) {
  const s = String(value || '').trim()
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(s)) return s
  return ''
}

function normalizeDateCell_(value, tz) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, tz || 'Asia/Kolkata', 'yyyy-MM-dd')
  }

  const s = String(value || '').trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, tz || 'Asia/Kolkata', 'yyyy-MM-dd')
  }

  return ''
}

function normalizeTimeCell_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    const hh = value.getHours()
    const mm = value.getMinutes()
    return (hh < 10 ? '0' + hh : String(hh)) + ':' + (mm < 10 ? '0' + mm : String(mm))
  }

  const s = String(value || '').trim().toLowerCase()
  if (!s) return ''

  const hhmm = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(s)
  if (hhmm) return hhmm[1] + ':' + hhmm[2]

  const ampm = /^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)$/.exec(s)
  if (ampm) {
    var h = Number(ampm[1]) % 12
    var m = ampm[2] || '00'
    if (ampm[3] === 'pm') h += 12
    return (h < 10 ? '0' + h : String(h)) + ':' + m
  }

  return ''
}
