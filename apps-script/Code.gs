  /**
  * TL GECI Slot Booking API (Google Apps Script)
  *
  * IMPORTANT
  * - Set SPREADSHEET_ID to your sheet id.
  * - Create tabs: Inventory, Bookings
  * - Deploy as Web App (Execute as: Me, Access: Anyone)
  */

  // Prefer setting this via Script Properties (key: SPREADSHEET_ID) so you don't
  // have to edit code for different deployments.
  const SPREADSHEET_ID = 'PUT_YOUR_SHEET_ID_HERE';
  const SHEET_INVENTORY = 'Inventory';
  const SHEET_BOOKINGS = 'Bookings';

  // Optional: set these via Script Properties (Project Settings → Script Properties)
  // - BOOKING_TEMPLATE_DOC_ID   : Google Docs template file id used for PDF generation
  // - ARCHIVE_ROOT_FOLDER_ID    : Drive folder id where YYYY/MM/DD folders will be created
  // - ARCHIVE_ROOT_FOLDER_NAME  : Folder name in My Drive root (fallback if no ID)
  // - LAB_CALENDAR_ID           : Google Calendar id where machine bookings are written (single calendar)

  function getSpreadsheetId_() {
    const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const id = String(prop || SPREADSHEET_ID || '').trim();
    if (!id || id === 'PUT_YOUR_SHEET_ID_HERE') {
      throw new Error(
        'SPREADSHEET_ID is not configured. Set Script Properties SPREADSHEET_ID to your Google Sheet id, or update the SPREADSHEET_ID constant.'
      );
    }
    return id;
  }

  function getBookingsSheetName_() {
    const prop = PropertiesService.getScriptProperties().getProperty('BOOKINGS_SHEET_NAME');
    const name = String(prop || SHEET_BOOKINGS || '').trim();
    return name || SHEET_BOOKINGS;
  }

  function getFormResponsesSheetName_() {
    // Optional: if set, only process submissions coming from this sheet tab.
    // Example value: "Form Responses 1"
    const prop = PropertiesService.getScriptProperties().getProperty('FORM_RESPONSES_SHEET_NAME');
    return String(prop || '').trim();
  }

  /**
  * Supported actions
  * - GET  ?action=inventory
  * - POST action=checkAndBook  (body is JSON string OR form params)
  */
  function doGet(e) {
    try {
      const action = (e && e.parameter && e.parameter.action) || 'inventory';
      if (action === 'inventory') return jsonOut_(handleInventory_());
      return jsonOut_({ ok: false, error: 'Unknown action' });
    } catch (err) {
      return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  }

  function doPost(e) {
    try {
      const params = (e && e.parameter) || {};
      const action = params.action || 'checkAndBook';

      let payload = null;
      try {
        payload = parsePayload_(e);
      } catch (err) {
        return jsonOut_({ ok: false, error: 'Invalid payload', detail: String(err) });
      }

      if (action === 'checkAndBook') {
        return jsonOut_(handleCheckAndBook_(payload));
      }

      return jsonOut_({ ok: false, error: 'Unknown action' });
    } catch (err) {
      return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
    }
  }

  function parsePayload_(e) {
    // Accept either JSON in raw body OR x-www-form-urlencoded fields.
    if (e && e.postData && e.postData.contents) {
      const raw = e.postData.contents;
      // If content looks like JSON, parse it; otherwise treat as form-encoded.
      if (raw && raw.trim().startsWith('{')) return JSON.parse(raw);
      // Form encoded fallback
      const obj = {};
      const parts = raw.split('&');
      for (var i = 0; i < parts.length; i++) {
        const [k, v] = parts[i].split('=');
        obj[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
      }
      if (obj.payload && String(obj.payload).trim().startsWith('{')) return JSON.parse(obj.payload);
      return obj;
    }

    // No body
    return {};
  }

  function handleInventory_() {
    const inv = readInventory_();
    return { ok: true, inventory: inv };
  }

  function handleCheckAndBook_(payload) {
    // Expected payload shape (example):
    // {
    //   booking: {
    //     name, ktuId, phone, email, semester, department, purpose,
    //     date: 'yyyy-mm-dd', timeFrom: 'HH:MM', timeTo: 'HH:MM',
    //     categories: ['MACHINES', ...],
    //     machines: ['3D PRINTER PS1_1', ...],
    //     itemQty: { 'ARDUINO UNO': 2, 'HAND DRILL': 1 }
    //   },
    //   commit: true|false
    // }

    const booking = payload.booking || payload;
    const commit = payload.commit === true || payload.commit === 'true';

    const normalized = normalizeBooking_(booking);
    const inv = readInventory_();
    const bookings = readBookings_();

    // If itemQty is missing but TotalText exists, parse it.
    if ((!normalized.itemQty || Object.keys(normalized.itemQty).length === 0) && normalized.totalText) {
      normalized.itemQty = parseTotalText_(normalized.totalText, inv);
    }

    const result = checkConflicts_(normalized, bookings, inv);

    if (!result.ok) {
      return result;
    }

    if (!commit) {
      // Check-only mode
      return result;
    }

    // Re-read bookings and inventory to reduce race issues.
    const bookings2 = readBookings_();
    const inv2 = readInventory_();
    const result2 = checkConflicts_(normalized, bookings2, inv2);
    if (!result2.ok) return result2;

    appendBooking_(normalized);

    const out = {
      ok: true,
      message: 'Booking accepted and stored.',
      inventoryLeft: result2.inventoryLeft,
      suggestions: result2.suggestions,
      conflicts: [],
    };

    // For web-app API bookings, also try PDF generation + email directly.
    // This makes API submissions independent from Form submit triggers.
    try {
      const props = PropertiesService.getScriptProperties();
      const templateDocId = String(props.getProperty('BOOKING_TEMPLATE_DOC_ID') || '').trim();
      const rootFolderId = String(props.getProperty('ARCHIVE_ROOT_FOLDER_ID') || '').trim();
      const rootFolderName = String(props.getProperty('ARCHIVE_ROOT_FOLDER_NAME') || 'TLGECI Bookings Archive');
      const bookingsSheet = ensureBookingSheet_();
      const bookingRowIndex = bookingsSheet.getLastRow();
      const header = bookingsSheet.getRange(1, 1, 1, bookingsSheet.getLastColumn()).getValues()[0].map(String);
      const idx = indexMap_(header);

      if (!templateDocId) {
        setIfColumnExists_(bookingsSheet, bookingRowIndex, idx, 'EmailStatus', 'SKIPPED');
        setIfColumnExists_(bookingsSheet, bookingRowIndex, idx, 'EmailError', 'BOOKING_TEMPLATE_DOC_ID is not set in Script Properties.');
        out.pdfEmail = {
          ok: false,
          skipped: true,
          reason: 'BOOKING_TEMPLATE_DOC_ID is not set in Script Properties.',
        };
      } else {
        const root = getArchiveRootFolder_(rootFolderId, rootFolderName);
        const confirmResult = sendConfirmationForBookingRow_(bookingsSheet, bookingRowIndex, {
          templateDocId: templateDocId,
          rootFolder: root,
          updateMonthlyArchive: true,
        });

        out.pdfEmail = confirmResult && confirmResult.email
          ? confirmResult.email
          : { ok: !!(confirmResult && confirmResult.ok) };

        out.calendar = confirmResult && confirmResult.calendar
          ? confirmResult.calendar
          : undefined;

        if (!confirmResult || confirmResult.ok !== true) {
          out.ok = false;
          out.message = 'Booking accepted and stored, but PDF/email or calendar sync failed.';
        }
      }
    } catch (err) {
      out.pdfEmail = {
        ok: false,
        error: String(err && err.message ? err.message : err),
      };
      out.message = 'Booking accepted and stored, but PDF/email failed.';
    }

    return out;
  }

  function normalizeBooking_(b) {
    const booking = {
      createdAtISO: new Date().toISOString(),
      name: String(b.name || '').trim(),
      ktuId: String(b.ktuId || '').trim(),
      phone: String(b.phone || '').trim(),
      email: String(b.email || '').trim(),
      semester: String(b.semester || '').trim(),
      department: String(b.department || '').trim(),
      purpose: String(b.purpose || '').trim(),
      date: normalizeDateValue_(b.date),
      timeFrom: normalizeTimeValue_(b.timeFrom),
      timeTo: normalizeTimeValue_(b.timeTo),
      categories: Array.isArray(b.categories) ? b.categories : splitCsv_(b.categories),
      machines: Array.isArray(b.machines) ? b.machines : splitCsv_(b.machines),
      itemQty: b.itemQty && typeof b.itemQty === 'object' ? b.itemQty : {},
      totalText: String(b.totalText || b.total || '').trim(),
      workingIndependently: String(b.workingIndependently || '').trim(),
      trainingCertificateNo: String(b.trainingCertificateNo || '').trim(),
      materialFromLab: String(b.materialFromLab || '').trim(),
      materialApproxQty: String(b.materialApproxQty || '').trim(),
      materialRequirementSummary: String(b.materialRequirementSummary || '').trim(),
    };

    if (!booking.materialRequirementSummary) {
      booking.materialRequirementSummary = buildMaterialRequirementSummary_(
        booking.materialFromLab,
        booking.materialApproxQty
      );
    }

    return booking;
  }

  function buildMaterialRequirementSummary_(materialFromLab, materialApproxQty) {
    const fromLab = String(materialFromLab || '').trim();
    const qty = String(materialApproxQty || '').trim();
    if (/^y(es)?$/i.test(fromLab)) {
      return qty ? 'Yes - ' + qty : 'Yes';
    }
    if (/^n(o)?$/i.test(fromLab)) return 'No';
    if (!fromLab && !qty) return 'Not applicable';
    if (!fromLab && qty) return 'Yes - ' + qty;
    return qty ? fromLab + ' - ' + qty : fromLab;
  }

  function parseTotalText_(text, inventory) {
    // Accept formats like:
    // - ARDUINO UNO x2
    // - ARDUINO UNO=2
    // - ARDUINO UNO: 2
    // Split by newlines, commas, semicolons.
    const invKeys = inventory ? Object.keys(inventory) : [];
    const invSet = {};
    for (var i = 0; i < invKeys.length; i++) invSet[invKeys[i]] = true;

    const out = {};
    const chunks = String(text || '')
      .split(/\n|,|;/g)
      .map((x) => x.trim())
      .filter(Boolean);

    for (var c = 0; c < chunks.length; c++) {
      const line = chunks[c];
      // Grab last integer on the line as qty
      const m = /(.*?)(?:=|:|x|×|\s)(\d+)\s*$/.exec(line);
      if (!m) continue;
      const rawItem = String(m[1] || '').trim();
      const qty = Number(m[2] || 0);
      if (!rawItem || !isFinite(qty) || qty <= 0) continue;

      // If inventory is present, only keep recognized items.
      if (inventory && Object.keys(inventory).length > 0) {
        if (!invSet[rawItem]) continue;
      }

      out[rawItem] = (out[rawItem] || 0) + Math.floor(qty);
    }

    return out;
  }

  function splitCsv_(s) {
    if (!s) return [];
    return String(s)
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function normalizeDateValue_(v) {
    if (!v) return '';
    // Date object from Sheet
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }

    const s = String(v || '').trim();
    if (!s) return '';

    // If already in ISO format (or ISO date-time), keep the date part.
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

    // Accept yyyy/mm/dd or yyyy.mm.dd
    const ymd = /^(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})$/.exec(s);
    if (ymd) return ymd[1] + '-' + pad2_(Number(ymd[2])) + '-' + pad2_(Number(ymd[3]));

    // Accept dd/mm/yyyy or dd.mm.yyyy (common in India). Assumes day-first.
    const dmy = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(s);
    if (dmy) return dmy[3] + '-' + pad2_(Number(dmy[2])) + '-' + pad2_(Number(dmy[1]));

    return s;
  }

  function normalizeTimeValue_(v) {
    if (!v) return '';
    // Date object from Sheet (time stored as date-time)
    if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
      return pad2_(v.getHours()) + ':' + pad2_(v.getMinutes());
    }
    return String(v || '').trim();
  }

  function timeToMinutes_(hhmm) {
    if (!hhmm) return null;
    // Apps Script may return Date objects for time cells.
    if (Object.prototype.toString.call(hhmm) === '[object Date]' && !isNaN(hhmm.getTime())) {
      return hhmm.getHours() * 60 + hhmm.getMinutes();
    }

    const m = /^([0-2]\d):([0-5]\d)$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function overlaps_(aFrom, aTo, bFrom, bTo) {
    // half-open [from, to)
    return aFrom < bTo && bFrom < aTo;
  }

  function readInventory_() {
    const ss = SpreadsheetApp.openById(getSpreadsheetId_());
    const sh = ss.getSheetByName(SHEET_INVENTORY);
    if (!sh) return {};

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return {};

    const header = values[0].map(String);
    const idxItem = header.indexOf('Item');
    const idxType = header.indexOf('Type');
    const idxTotal = header.indexOf('Total');
    if (idxItem < 0 || idxType < 0 || idxTotal < 0) return {};

    const inv = {};
    for (var r = 1; r < values.length; r++) {
      const row = values[r];
      const item = String(row[idxItem] || '').trim();
      const type = String(row[idxType] || '').trim();
      const total = Number(row[idxTotal] || 0);
      if (!item) continue;
      inv[item] = { type: type, total: isFinite(total) ? total : 0 };
    }
    return inv;
  }

  function readBookings_() {
    const ss = SpreadsheetApp.openById(getSpreadsheetId_());
    const sh = ss.getSheetByName(getBookingsSheetName_());
    if (!sh) return [];

    const values = sh.getDataRange().getValues();
    if (values.length < 2) return [];

    const header = values[0].map(String);
    let idxDate = header.indexOf('Date');
    let idxFrom = header.indexOf('TimeFrom');
    let idxTo = header.indexOf('TimeTo');
    let idxMachines = header.indexOf('Machines');
    let idxItemQty = header.indexOf('ItemQuantitiesJSON');
    let idxTotalText = header.indexOf('TotalText');
    let idxName = header.indexOf('Name');

    // Fallback to the column order used by appendBooking_() when headers don't match.
    // Order (0-based):
    // 0 CreatedAtISO
    // 1 Name
    // 8 Date
    // 9 TimeFrom
    // 10 TimeTo
    // 12 Machines
    // 13 ItemQuantitiesJSON
    // 14 TotalText
    if (idxName < 0) idxName = 1;
    if (idxDate < 0) idxDate = 8;
    if (idxFrom < 0) idxFrom = 9;
    if (idxTo < 0) idxTo = 10;
    if (idxMachines < 0) idxMachines = 12;
    if (idxItemQty < 0) idxItemQty = 13;
    if (idxTotalText < 0) idxTotalText = 14;

    const bookings = [];
    for (var r = 1; r < values.length; r++) {
      const row = values[r];
      const date = normalizeDateValue_(row[idxDate]);
      const timeFrom = normalizeTimeValue_(row[idxFrom]);
      const timeTo = normalizeTimeValue_(row[idxTo]);
      const machines = splitCsv_(row[idxMachines]);

      let itemQty = {};
      const rawQty = String(row[idxItemQty] || '').trim();
      if (rawQty) {
        try {
          itemQty = JSON.parse(rawQty);
        } catch (e) {
          itemQty = {};
        }
      }

      bookings.push({
        date: date,
        timeFrom: timeFrom,
        timeTo: timeTo,
        machines: machines,
        itemQty: itemQty,
        totalText: String(row[idxTotalText] || '').trim(),
        name: String(row[idxName] || '').trim(),
      });
    }
    return bookings;
  }

  function checkConflicts_(request, existingBookings, inventory) {
    const conflicts = [];
    const warnings = [];

    const reqFromMin = timeToMinutes_(request.timeFrom);
    const reqToMin = timeToMinutes_(request.timeTo);
    if (!request.date || reqFromMin === null || reqToMin === null || reqFromMin >= reqToMin) {
      return { ok: false, error: 'Invalid date/time', conflicts: [] };
    }

    // Machine overlap conflicts
    // Default behavior is exclusive (capacity = 1).
    // If Inventory sheet contains a row: Item=<machine>, Type=machine, Total=<N>,
    // then up to N concurrent overlapping bookings are allowed for that machine.
    const machineLeft = computeMachineLeft_(request, existingBookings, inventory);
    const reqMachines = request.machines || [];
    if (reqMachines.length > 0) {
      for (var rm = 0; rm < reqMachines.length; rm++) {
        var machineReq = reqMachines[rm];

        // If machine is tracked in Inventory sheet as type=machine, use its remaining count.
        if (machineLeft && machineLeft[machineReq] !== undefined) {
          var leftCount = Number(machineLeft[machineReq] || 0);
          if (leftCount <= 0) {
            conflicts.push({
              kind: 'machine',
              item: machineReq,
              date: request.date,
              requested: { from: request.timeFrom, to: request.timeTo },
              left: leftCount,
            });
          }
          continue;
        }

        // Fallback: exclusive check (any overlap is a conflict)
        for (var i = 0; i < existingBookings.length; i++) {
          var b = existingBookings[i];
          if (b.date !== request.date) continue;

          var bFrom = timeToMinutes_(b.timeFrom);
          var bTo = timeToMinutes_(b.timeTo);
          if (bFrom === null || bTo === null) continue;
          if (!overlaps_(reqFromMin, reqToMin, bFrom, bTo)) continue;

          if (b.machines && b.machines.indexOf(machineReq) >= 0) {
            conflicts.push({
              kind: 'machine',
              item: machineReq,
              date: request.date,
              requested: { from: request.timeFrom, to: request.timeTo },
              existing: { from: b.timeFrom, to: b.timeTo, name: b.name || '' },
            });
            break;
          }
        }
      }
    }

    // Inventory conflicts
    // - components: stock based (total - sum of all bookings)
    // - tool / powerTool: time-slot based (total - sum of overlapping bookings)
    const inventoryLeft = computeInventoryLeft_(request, existingBookings, inventory);
    // Merge machine capacity left (time-slot based)
    if (machineLeft) {
      Object.keys(machineLeft).forEach((k) => {
        inventoryLeft[k] = machineLeft[k];
      });
    }

    const reqItemQty = request.itemQty || {};
    Object.keys(reqItemQty).forEach((item) => {
      const need = Number(reqItemQty[item] || 0);
      if (!need || need <= 0) return;

      const left = inventoryLeft[item];
      if (left === undefined) {
        // Not tracked in inventory sheet; treat as allowed
        warnings.push({ kind: 'missingInventory', item: item });
        return;
      }

      if (need > left) {
        conflicts.push({
          kind: 'inventory',
          item: item,
          needed: need,
          left: left,
        });
      }
    });

    if (conflicts.length > 0) {
      const suggestions = suggestNextSlot_(request, existingBookings, inventory);
      return {
        ok: false,
        error: 'Conflict detected',
        conflicts: conflicts,
        inventoryLeft: inventoryLeft,
        suggestions: suggestions,
        warnings: warnings,
      };
    }

    return {
      ok: true,
      conflicts: [],
      inventoryLeft: inventoryLeft,
      suggestions: suggestNextSlot_(request, existingBookings, inventory),
      warnings: warnings,
    };
  }

  function computeMachineLeft_(request, existingBookings, inventory) {
    const left = {};
    if (!inventory) return left;

    // Only items marked as type=machine are tracked here.
    Object.keys(inventory).forEach((item) => {
      const meta = inventory[item];
      if (!meta || meta.type !== 'machine') return;
      left[item] = Number(meta.total || 0);
    });

    const reqDate = request.date;
    const reqFromMin = timeToMinutes_(request.timeFrom);
    const reqToMin = timeToMinutes_(request.timeTo);

    existingBookings.forEach((b) => {
      if (!b || b.date !== reqDate) return;
      const bFrom = timeToMinutes_(b.timeFrom);
      const bTo = timeToMinutes_(b.timeTo);
      if (bFrom === null || bTo === null) return;
      if (!overlaps_(reqFromMin, reqToMin, bFrom, bTo)) return;

      const machines = b.machines || [];
      for (var i = 0; i < machines.length; i++) {
        const m = machines[i];
        if (!(m in left)) continue;
        left[m] = Math.max(0, Number(left[m] || 0) - 1);
      }
    });

    return left;
  }

  function computeInventoryLeft_(request, existingBookings, inventory) {
    const left = {};
    Object.keys(inventory).forEach((item) => {
      left[item] = Number(inventory[item].total || 0);
    });

    const reqDate = request.date;
    const reqFromMin = timeToMinutes_(request.timeFrom);
    const reqToMin = timeToMinutes_(request.timeTo);

    existingBookings.forEach((b) => {
      const bItemQty = (b && b.itemQty) || {};
      const bFrom = timeToMinutes_(b.timeFrom);
      const bTo = timeToMinutes_(b.timeTo);

      Object.keys(bItemQty).forEach((item) => {
        if (!(item in inventory)) return;
        const meta = inventory[item];
        const qty = Number(bItemQty[item] || 0);
        if (!qty) return;

        if (meta.type === 'component') {
          // Stock consumed / reserved globally
          left[item] = Math.max(0, Number(left[item] || 0) - qty);
          return;
        }

        // tool / powerTool: count conflicts only for overlapping time on same date
        if (b.date !== reqDate) return;
        if (bFrom === null || bTo === null) return;
        if (!overlaps_(reqFromMin, reqToMin, bFrom, bTo)) return;

        left[item] = Math.max(0, Number(left[item] || 0) - qty);
      });
    });

    return left;
  }

  function suggestNextSlot_(request, existingBookings, inventory) {
    // Minimal: for each requested machine, suggest next slot when capacity frees.
    const reqFromMin = timeToMinutes_(request.timeFrom);
    const reqToMin = timeToMinutes_(request.timeTo);
    const duration = reqToMin - reqFromMin;

    const out = {};
    const machines = request.machines || [];
    if (!machines.length) return out;

    machines.forEach((machine) => {
      // Determine machine capacity (default 1)
      var capacity = 1;
      if (inventory && inventory[machine] && inventory[machine].type === 'machine') {
        var t = Number(inventory[machine].total || 0);
        if (isFinite(t) && t > 0) capacity = t;
      }

      var overlappingEnds = [];
      existingBookings.forEach((b) => {
        if (b.date !== request.date) return;
        if (!b.machines || b.machines.indexOf(machine) < 0) return;

        const bFrom = timeToMinutes_(b.timeFrom);
        const bTo = timeToMinutes_(b.timeTo);
        if (bFrom === null || bTo === null) return;
        if (!overlaps_(reqFromMin, reqToMin, bFrom, bTo)) return;

        overlappingEnds.push(bTo);
      });

      if (overlappingEnds.length === 0) return;

      // If capacity is already full, next start is when the earliest overlapping booking ends.
      // If capacity is not full, the current slot should be available (no suggestion needed).
      if (overlappingEnds.length < capacity) return;

      var earliestEnd = overlappingEnds.reduce((acc, v) => (acc === null ? v : Math.min(acc, v)), null);
      if (earliestEnd === null) return;
      const nextFrom = earliestEnd;
      const nextTo = nextFrom + duration;
      out[machine] = { from: minutesToTime_(nextFrom), to: minutesToTime_(nextTo) };
    });

    return out;
  }

  function minutesToTime_(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return pad2_(h) + ':' + pad2_(m);
  }

  function pad2_(n) {
    const s = String(n);
    return s.length === 1 ? '0' + s : s;
  }

  function ensureBookingSheet_() {
    const ss = SpreadsheetApp.openById(getSpreadsheetId_());
    let sh = ss.getSheetByName(getBookingsSheetName_());
    if (!sh) sh = ss.insertSheet(SHEET_BOOKINGS);

    const header = [
      'CreatedAtISO',
      'Name',
      'KTU ID',
      'Phone',
      'Email',
      'Semester',
      'Department',
      'Purpose',
      'Date',
      'TimeFrom',
      'TimeTo',
      'Categories',
      'Machines',
      'ItemQuantitiesJSON',
      'TotalText',
      'WorkingIndependently',
      'TrainingCertificateNo',
      'MaterialFromLab',
      'MaterialApproxQty',
      'MaterialRequirementSummary',
      // Tracking columns for PDF/email automation (stored in Bookings tab).
      'EmailSentAtISO',
      'EmailStatus',
      'EmailError',
      'PdfFileId',
      'PdfFileUrl',
      // Calendar sync tracking (single calendar, one event per machine)
      'CalendarSyncedAtISO',
      'CalendarStatus',
      'CalendarError',
      'CalendarEventIdsJSON',
      'SourceSheet',
      'SourceRow',
    ];

    if (sh.getLastRow() === 0) {
      sh.appendRow(header);
    } else {
      // Ensure base header columns exist; append missing columns at the end.
      let existingHeader = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
      let changed = false;
      for (var i = 0; i < header.length; i++) {
        if (existingHeader.indexOf(header[i]) >= 0) continue;
        existingHeader.push(header[i]);
        changed = true;
      }

      if (changed) {
        sh.getRange(1, 1, 1, existingHeader.length).setValues([existingHeader]);
      }
    }

    return sh;
  }

  /**
   * Manual helper: retry confirmation (PDF/email + calendar) for the latest row in Bookings.
   * Run from Apps Script editor after fixing Script Properties/permissions.
   */
  function retryLatestBookingConfirmation() {
    const props = PropertiesService.getScriptProperties();
    const templateDocId = String(props.getProperty('BOOKING_TEMPLATE_DOC_ID') || '').trim();
    if (!templateDocId) throw new Error('Missing Script Property BOOKING_TEMPLATE_DOC_ID');

    const rootFolderId = String(props.getProperty('ARCHIVE_ROOT_FOLDER_ID') || '').trim();
    const rootFolderName = String(props.getProperty('ARCHIVE_ROOT_FOLDER_NAME') || 'TLGECI Bookings Archive');
    const root = getArchiveRootFolder_(rootFolderId, rootFolderName);

    const sheet = ensureBookingSheet_();
    const rowIndex = sheet.getLastRow();
    if (rowIndex < 2) throw new Error('No booking rows found in Bookings sheet.');

    return sendConfirmationForBookingRow_(sheet, rowIndex, {
      templateDocId: templateDocId,
      rootFolder: root,
      updateMonthlyArchive: true,
    });
  }

  /**
   * Manual helper: retry confirmation for a specific Bookings row index.
   */
  function retryBookingConfirmationByRow(rowIndex) {
    const row = Number(rowIndex);
    if (!isFinite(row) || row < 2) throw new Error('rowIndex must be a row number >= 2.');

    const props = PropertiesService.getScriptProperties();
    const templateDocId = String(props.getProperty('BOOKING_TEMPLATE_DOC_ID') || '').trim();
    if (!templateDocId) throw new Error('Missing Script Property BOOKING_TEMPLATE_DOC_ID');

    const rootFolderId = String(props.getProperty('ARCHIVE_ROOT_FOLDER_ID') || '').trim();
    const rootFolderName = String(props.getProperty('ARCHIVE_ROOT_FOLDER_NAME') || 'TLGECI Bookings Archive');
    const root = getArchiveRootFolder_(rootFolderId, rootFolderName);

    const sheet = ensureBookingSheet_();
    if (row > sheet.getLastRow()) throw new Error('rowIndex is beyond last row in Bookings sheet.');

    return sendConfirmationForBookingRow_(sheet, row, {
      templateDocId: templateDocId,
      rootFolder: root,
      updateMonthlyArchive: true,
    });
  }

  function normalizeCalendarId_(raw) {
    let v = String(raw || '').trim();
    if (!v) return '';

    // Common mistake: pasting the embed URL instead of the Calendar ID.
    // Example: https://calendar.google.com/calendar/embed?src=<CAL_ID>&ctz=...
    if (/calendar\.google\.com\/calendar\/embed/i.test(v)) {
      const m = /[?&]src=([^&]+)/i.exec(v);
      if (m && m[1]) {
        try {
          v = decodeURIComponent(m[1]);
        } catch (e) {
          v = m[1];
        }
      }
    }

    // Trim trailing slashes/backslashes that can appear when copying.
    v = v.replace(/[\\/\s]+$/g, '');
    return v.trim();
  }

  function getLabCalendarId_() {
    const props = PropertiesService.getScriptProperties();
    return normalizeCalendarId_(props.getProperty('LAB_CALENDAR_ID'));
  }

  /**
   * Debug helper: list calendars accessible to the authorized account.
   * Run from the Apps Script editor and check Logs / return value.
   */
  function listAccessibleCalendars() {
    const out = [];
    try {
      const def = CalendarApp.getDefaultCalendar();
      if (def) out.push({ name: def.getName(), id: def.getId(), isDefault: true });
    } catch (e) {
      // ignore
    }

    const cals = CalendarApp.getAllCalendars();
    for (var i = 0; i < cals.length; i++) {
      const cal = cals[i];
      out.push({ name: cal.getName(), id: cal.getId(), isDefault: false });
    }

    // De-dupe by id
    const seen = {};
    const uniq = [];
    for (var j = 0; j < out.length; j++) {
      const id = String(out[j].id || '');
      if (!id || seen[id]) continue;
      seen[id] = true;
      uniq.push(out[j]);
    }

    Logger.log(JSON.stringify(uniq, null, 2));
    return uniq;
  }

  function parseTimeParts_(hhmm) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm || '').trim());
    if (!m) return null;
    return { hh: Number(m[1]), mm: Number(m[2]) };
  }

  function makeDateTime_(yyyyMmDd, hhmm) {
    const d = normalizeDateValue_(yyyyMmDd);
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const p = parseTimeParts_(hhmm);
    if (!p) return null;
    const y = Number(d.slice(0, 4));
    const mo = Number(d.slice(5, 7));
    const da = Number(d.slice(8, 10));
    const dt = new Date(y, mo - 1, da, p.hh, p.mm, 0, 0);
    if (isNaN(dt.getTime())) return null;
    return dt;
  }

  function syncLabCalendarForBooking_(booking) {
    // Creates one event per machine in a single calendar.
    // Event title = machine name, no personal details.
    const calId = getLabCalendarId_();
    if (!calId) {
      return { ok: false, error: 'LAB_CALENDAR_ID is not set in Script Properties.' };
    }

    const calendar = CalendarApp.getCalendarById(calId);
    if (!calendar) {
      return { ok: false, error: 'Calendar not found or not accessible for id: ' + calId };
    }

    const slotDate = normalizeDateValue_(booking.date);
    const timeFrom = normalizeTimeValue_(booking.timeFrom);
    const timeTo = normalizeTimeValue_(booking.timeTo);
    const start = makeDateTime_(slotDate, timeFrom);
    const end = makeDateTime_(slotDate, timeTo);
    if (!start || !end) {
      return { ok: false, error: 'Invalid date/time for calendar sync.' };
    }
    if (end.getTime() <= start.getTime()) {
      return { ok: false, error: 'Invalid time range (To must be after From) for calendar sync.' };
    }

    const machines = Array.isArray(booking.machines) ? booking.machines : splitCsv_(booking.machines);
    const cleaned = machines
      .map((m) => String(m || '').trim())
      .filter(Boolean);
    if (cleaned.length === 0) {
      return { ok: true, created: 0, eventIdsByMachine: {} };
    }

    const eventIdsByMachine = {};
    for (var i = 0; i < cleaned.length; i++) {
      const machine = cleaned[i];
      const ev = calendar.createEvent(machine, start, end, {
        description: 'Machine booking (auto).',
      });
      eventIdsByMachine[machine] = ev.getId();
    }

    return { ok: true, created: cleaned.length, eventIdsByMachine: eventIdsByMachine, calendarId: calId };
  }

  function appendBooking_(b) {
    const sh = ensureBookingSheet_();
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    const idx = indexMap_(header);
    const materialSummary = buildMaterialRequirementSummary_(b.materialFromLab, b.materialApproxQty);
    const row = new Array(header.length).fill('');

    function setCol(name, value) {
      const col = idx[name];
      if (col === undefined) return;
      row[col] = value;
    }

    setCol('CreatedAtISO', b.createdAtISO || new Date().toISOString());
    setCol('Name', b.name || '');
    setCol('KTU ID', b.ktuId || '');
    setCol('Phone', b.phone || '');
    setCol('Email', b.email || '');
    setCol('Semester', b.semester || '');
    setCol('Department', b.department || '');
    setCol('Purpose', b.purpose || '');
    setCol('Date', b.date || '');
    setCol('TimeFrom', b.timeFrom || '');
    setCol('TimeTo', b.timeTo || '');
    setCol('Categories', (b.categories || []).join(', '));
    setCol('Machines', (b.machines || []).join(', '));
    setCol('ItemQuantitiesJSON', JSON.stringify(b.itemQty || {}));
    setCol('TotalText', b.totalText || '');
    setCol('WorkingIndependently', b.workingIndependently || '');
    setCol('TrainingCertificateNo', b.trainingCertificateNo || '');
    setCol('MaterialFromLab', b.materialFromLab || '');
    setCol('MaterialApproxQty', b.materialApproxQty || '');
    setCol('MaterialRequirementSummary', b.materialRequirementSummary || materialSummary);

    sh.appendRow(row);
  }

  function jsonOut_(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  }

  /**
  * ------------------------------
  * Booking archive helpers (Drive)
  * ------------------------------
  *
  * These helpers are NOT used by the web app endpoints; they are for manual/triggered
  * maintenance tasks.
  *
  * What it does:
  * - Reads the master spreadsheet tab `Bookings`
  * - Groups rows by Year/Month based on the `Date` column
  * - Creates Drive folders: <root>/<YYYY>/<MM>
  * - Creates/updates a monthly spreadsheet `Bookings-YYYY-MM` in that folder
  * - Writes rows + sorts by Date then TimeFrom
  */

  function archiveBookingsToDrive(options) {
    options = options || {};
    const props = PropertiesService.getScriptProperties();
    const rootFolderName = String(
      options.rootFolderName ||
        props.getProperty('ARCHIVE_ROOT_FOLDER_NAME') ||
        'TLGECI Bookings Archive'
    );
    const rootFolderId = String(
      options.rootFolderId || props.getProperty('ARCHIVE_ROOT_FOLDER_ID') || ''
    ).trim();
    const overwriteExisting = options.overwriteExisting !== false; // default true
    const includeHeader = options.includeHeader !== false; // default true

    const ss = SpreadsheetApp.openById(getSpreadsheetId_());
    const sh = ss.getSheetByName(getBookingsSheetName_());
    if (!sh) throw new Error('Missing sheet tab: ' + SHEET_BOOKINGS);

    const values = sh.getDataRange().getValues();
    if (values.length < 2) {
      return { ok: true, message: 'No booking rows to archive.' };
    }

    const header = values[0].map(String);
    let idxDate = findColumnIndexByCandidates_(header, ['Date', 'Date of using lab facilities'], 8);
    let idxFrom = findColumnIndexByCandidates_(
      header,
      ['TimeFrom', 'Time slot - From', 'Time slot - From'],
      9
    );

    const groups = {}; // key: YYYY-MM -> { header, rows: [][] }
    const monthKeys = [];

    for (var r = 1; r < values.length; r++) {
      const row = values[r];
      const dateStr = normalizeDateValue_(row[idxDate]);
      if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
      const ym = dateStr.slice(0, 7); // YYYY-MM
      if (!groups[ym]) {
        groups[ym] = { header: header, rows: [] };
        monthKeys.push(ym);
      }
      groups[ym].rows.push(row);
    }

    monthKeys.sort();

    const root = getArchiveRootFolder_(rootFolderId, rootFolderName);
    const result = { ok: true, rootFolderId: root.getId(), months: [] };

    for (var i = 0; i < monthKeys.length; i++) {
      const ym2 = monthKeys[i];
      const yyyy = ym2.slice(0, 4);
      const mm = ym2.slice(5, 7);
      const yearFolder = getOrCreateChildFolder_(root, yyyy);
      const monthFolder = getOrCreateChildFolder_(yearFolder, monthFolderName_(yyyy, mm));

      const fileName = 'Bookings-' + ym2;
      const createdOrOpened = getOrCreateSpreadsheetInFolder_(monthFolder, fileName);
      const spreadsheet = createdOrOpened.spreadsheet;
      const existedAlready = createdOrOpened.existed === true;
      if (existedAlready && !overwriteExisting) {
        result.months.push({ ym: ym2, spreadsheetId: spreadsheet.getId(), folderId: monthFolder.getId(), skipped: true });
        continue;
      }
      const sheet = ensureSingleSheet_(spreadsheet, SHEET_BOOKINGS);

      writeBookingsRows_(sheet, groups[ym2].header, groups[ym2].rows, {
        includeHeader: includeHeader,
        idxDate: idxDate,
        idxFrom: idxFrom,
      });

      result.months.push({ ym: ym2, spreadsheetId: spreadsheet.getId(), folderId: monthFolder.getId(), skipped: false });
    }

    return result;
  }

  function monthFolderName_(yyyy, mm) {
    // e.g. "February"
    const y = Number(yyyy);
    const m = Number(mm);
    if (!isFinite(y) || !isFinite(m) || m < 1 || m > 12) return String(mm || '').trim() || 'Unknown';
    const d = new Date(y, m - 1, 1);
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMMM');
  }

  function getArchiveRootFolder_(rootFolderId, rootFolderName) {
    if (rootFolderId) {
      try {
        return DriveApp.getFolderById(rootFolderId);
      } catch (e) {
        // Fall back to name-based creation if ID is invalid or inaccessible.
      }
    }
    return getOrCreateFolderInRoot_(rootFolderName);
  }

  /**
  * ------------------------------
  * Google Forms automation (PDF + email + Drive folders)
  * ------------------------------
  *
  * Installable trigger handler.
  * When a new Form response row is added, this will:
  * - Read the row
  * - Create folders: <root>/<YYYY>/<MM>/<DD>
  * - Copy a Doc template, fill placeholders, export to PDF
  * - Save PDF in that day folder
  * - Email the PDF to the user
  * - Mark the row as sent (or error)
  */

  function setupFormSubmitTrigger() {
    const ssId = getSpreadsheetId_();
    const triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      const t = triggers[i];
      if (t.getHandlerFunction && t.getHandlerFunction() === 'onFormSubmitProcess_') {
        return { ok: true, message: 'Trigger already exists (onFormSubmitProcess_).' };
      }
    }

    ScriptApp.newTrigger('onFormSubmitProcess_').forSpreadsheet(ssId).onFormSubmit().create();
    return { ok: true, message: 'Form submit trigger created.' };
  }

  function removeFormSubmitTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    var removed = 0;
    for (var i = 0; i < triggers.length; i++) {
      const t = triggers[i];
      if (t.getHandlerFunction && t.getHandlerFunction() === 'onFormSubmitProcess_') {
        ScriptApp.deleteTrigger(t);
        removed++;
      }
    }
    return { ok: true, removed: removed };
  }

  /**
  * One-time helper to run manually from the Apps Script editor.
  *
  * Purpose:
  * - Validates required Script Properties
  * - Forces OAuth permission prompts (Sheets/Drive/Docs/Calendar)
  * - Does NOT send any email and does NOT create any Drive files
  *
  * Run order recommendation:
  * 1) Set Script Properties (SPREADSHEET_ID, BOOKING_TEMPLATE_DOC_ID, ARCHIVE_ROOT_FOLDER_ID, LAB_CALENDAR_ID)
  * 2) Run authorizeAndValidateSetup()
  * 3) Run setupFormSubmitTrigger()
  */
  function authorizeAndValidateSetup() {
    const props = PropertiesService.getScriptProperties();

    const spreadsheetId = getSpreadsheetId_();
    const templateDocId = String(props.getProperty('BOOKING_TEMPLATE_DOC_ID') || '').trim();
    const rootFolderId = String(props.getProperty('ARCHIVE_ROOT_FOLDER_ID') || '').trim();
    const rootFolderName = String(props.getProperty('ARCHIVE_ROOT_FOLDER_NAME') || 'TLGECI Bookings Archive');
    const labCalendarId = String(props.getProperty('LAB_CALENDAR_ID') || '').trim();

    if (!templateDocId) throw new Error('Missing Script Property BOOKING_TEMPLATE_DOC_ID');
    if (!rootFolderId && !rootFolderName) throw new Error('Missing ARCHIVE_ROOT_FOLDER_ID (or ARCHIVE_ROOT_FOLDER_NAME)');
    if (!labCalendarId) throw new Error('Missing Script Property LAB_CALENDAR_ID');

    // Sheets permission
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets();
    if (!sheets || sheets.length === 0) throw new Error('Spreadsheet has no sheets (unexpected).');

    // Drive permission (+ validate root folder access)
    const root = getArchiveRootFolder_(rootFolderId, rootFolderName);
    if (!root) throw new Error('Failed to resolve archive root folder.');
    // Touch a Drive property without creating files.
    root.getName();

    // Docs permission (+ validate template access)
    const templateFile = DriveApp.getFileById(templateDocId);
    const doc = DocumentApp.openById(templateFile.getId());
    const body = doc.getBody();
    if (!body) throw new Error('Template doc has no body (unexpected).');

    // Calendar permission (+ validate calendar access)
    const cal = CalendarApp.getCalendarById(labCalendarId);
    if (!cal) throw new Error('Calendar not found or not accessible for id: ' + labCalendarId);
    cal.getName();

    return {
      ok: true,
      spreadsheetId: spreadsheetId,
      bookingsSheetName: getBookingsSheetName_(),
      formResponsesSheetName: getFormResponsesSheetName_() || 'Form Responses 1',
      archiveRootFolder: { id: root.getId(), name: root.getName() },
      templateDoc: { id: templateDocId, name: templateFile.getName() },
      calendar: { id: labCalendarId, name: cal.getName() },
    };
  }

  /**
  * One-time helper: migrate existing Google Form responses into the `Bookings` tab.
  *
  * This is useful if you previously configured the script to use `Form Responses 1`
  * as the bookings sheet and want to restore the separation.
  *
  * Safe by default:
  * - Does NOT delete any rows from `Form Responses 1`
  * - Adds a marker column `MigratedToBookingsAtISO` to avoid duplicates
  */
  function migrateFormResponsesToBookings(options) {
    options = options || {};
    const ss = SpreadsheetApp.openById(getSpreadsheetId_());
    const sourceName = String(options.sourceSheetName || getFormResponsesSheetName_() || 'Form Responses 1').trim();
    const source = ss.getSheetByName(sourceName);
    if (!source) throw new Error('Missing source sheet: ' + sourceName);

    const sendEmails = options.sendEmails === true;
    const templateDocId = String(
      options.templateDocId || PropertiesService.getScriptProperties().getProperty('BOOKING_TEMPLATE_DOC_ID') || ''
    ).trim();
    const rootFolderId = String(
      options.rootFolderId || PropertiesService.getScriptProperties().getProperty('ARCHIVE_ROOT_FOLDER_ID') || ''
    ).trim();
    const rootFolderName = String(
      options.rootFolderName || PropertiesService.getScriptProperties().getProperty('ARCHIVE_ROOT_FOLDER_NAME') || 'TLGECI Bookings Archive'
    );

    const root = rootFolderId || rootFolderName ? getArchiveRootFolder_(rootFolderId, rootFolderName) : null;

    const lastRow = source.getLastRow();
    const lastCol = source.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return { ok: true, migrated: 0, skipped: 0 };

    let header = source.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const migrateColName = 'MigratedToBookingsAtISO';
    let migrateIdx = indexOfHeader_(header, migrateColName);
    if (migrateIdx < 0) {
      header.push(migrateColName);
      source.getRange(1, 1, 1, header.length).setValues([header]);
      migrateIdx = header.length - 1;
    }

    const bookingsSheet = ensureBookingSheet_();
    const bookingsHeader = bookingsSheet.getRange(1, 1, 1, bookingsSheet.getLastColumn()).getValues()[0].map(String);
    const bookingsIdx = indexMap_(bookingsHeader);

    var migrated = 0;
    var skipped = 0;
    for (var r = 2; r <= lastRow; r++) {
      const row = source.getRange(r, 1, 1, source.getLastColumn()).getValues()[0];
      const marker = String(row[migrateIdx] || '').trim();
      if (marker) {
        skipped++;
        continue;
      }

      const booking = normalizeBookingFromFormRow_(header, row);
      if (!booking.email || !booking.date) {
        skipped++;
        source.getRange(r, migrateIdx + 1).setValue('SKIPPED (missing email/date)');
        continue;
      }

      appendBooking_(booking);
      const newRow = bookingsSheet.getLastRow();
      setIfColumnExists_(bookingsSheet, newRow, bookingsIdx, 'SourceSheet', source.getName());
      setIfColumnExists_(bookingsSheet, newRow, bookingsIdx, 'SourceRow', r);

      // Optionally send confirmations for migrated rows.
      if (sendEmails) {
        if (!templateDocId) throw new Error('sendEmails=true but BOOKING_TEMPLATE_DOC_ID is not set');
        if (!root) throw new Error('sendEmails=true but ARCHIVE_ROOT_FOLDER_ID/NAME not set');
        sendConfirmationForBookingRow_(bookingsSheet, newRow, {
          templateDocId: templateDocId,
          rootFolder: root,
          updateMonthlyArchive: true,
        });
      }

      source.getRange(r, migrateIdx + 1).setValue(new Date().toISOString());
      migrated++;
    }

    return { ok: true, migrated: migrated, skipped: skipped, sendEmails: sendEmails, sourceSheet: sourceName };
  }

  function onFormSubmitProcess_(e) {
    // IMPORTANT: this must stay lightweight; triggers have execution limits.
    const props = PropertiesService.getScriptProperties();
    const templateDocId = String(props.getProperty('BOOKING_TEMPLATE_DOC_ID') || '').trim();
    if (!templateDocId) throw new Error('Missing Script Property BOOKING_TEMPLATE_DOC_ID (Google Doc template id)');

    const rootFolderId = String(props.getProperty('ARCHIVE_ROOT_FOLDER_ID') || '').trim();
    const rootFolderName = String(props.getProperty('ARCHIVE_ROOT_FOLDER_NAME') || 'TLGECI Bookings Archive');
    const root = getArchiveRootFolder_(rootFolderId, rootFolderName);

    if (!e || !e.range) throw new Error('Missing event range. Ensure this is an installable Form Submit trigger.');

    const sheet = e.range.getSheet();
    const expectedSource = getFormResponsesSheetName_();
    if (expectedSource && sheet.getName() !== expectedSource) {
      // Ignore events from other sheets.
      return;
    }
    const rowIndex = e.range.getRow();
    if (rowIndex < 2) return;

    // Read the submitted response row.
    const lastCol = sheet.getLastColumn();
    const responseHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const responseRow = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

    // Convert response row -> normalized booking object.
    const booking = normalizeBookingFromFormRow_(responseHeader, responseRow);
    if (!booking.email) throw new Error('Email is empty (check your Form column name: Email ID)');
    if (!booking.date) throw new Error('Slot Date is empty (check: Date of using lab facilities)');

    // Append into Bookings tab (separate from Form Responses 1).
    const bookingsSheet = ensureBookingSheet_();
    appendBooking_(booking);
    const bookingRowIndex = bookingsSheet.getLastRow();

    // Store source pointers (optional).
    const header2 = bookingsSheet.getRange(1, 1, 1, bookingsSheet.getLastColumn()).getValues()[0].map(String);
    const idxMap = indexMap_(header2);
    setIfColumnExists_(bookingsSheet, bookingRowIndex, idxMap, 'SourceSheet', sheet.getName());
    setIfColumnExists_(bookingsSheet, bookingRowIndex, idxMap, 'SourceRow', rowIndex);

    // Generate PDF + email using the Bookings row.
    sendConfirmationForBookingRow_(bookingsSheet, bookingRowIndex, {
      templateDocId: templateDocId,
      rootFolder: root,
      updateMonthlyArchive: true,
    });
  }

  function normalizeBookingFromFormRow_(header, row) {
    const get = (cands) => getFieldByHeaderCandidates_(header, row, cands);
    const name = String(get(['Name']) || '').trim();
    const ktuId = String(get(['KTU ID', 'KTU']) || '').trim();
    const semester = String(get(['Semester']) || '').trim();
    const department = String(get(['Department']) || '').trim();
    const phone = String(get(['Phone No', 'Phone', 'Phone Number']) || '').trim();
    const email = String(get(['Email ID', 'Email', 'Email Address']) || '').trim();
    const purpose = String(get(['Purpose/project description (brief)', 'Purpose', 'Description']) || '').trim();
    const date = normalizeDateValue_(get(['Date of using lab facilities', 'Date']));

    // Time cells from Form responses sheet are often Date objects.
    const timeFrom = normalizeTimeValue_(get(['Time slot - From', 'TimeFrom', 'Time From']));
    const timeTo = normalizeTimeValue_(get(['Time slot - TO', 'Time slot - To', 'TimeTo', 'Time To']));

    // Raw selects
    const categories = splitCsv_(get(['CATAGOERY', 'CATEGORY', 'Category']));
    const machines = splitCsv_(get(['MACHINES', 'Machines', 'Machine']));

    const totalText = String(get(['TOTAL ..', 'TOTAL', 'Total', 'TotalText']) || '').trim();

    const independentRaw = get([
      'Working Independently (Yes/No).\n If Yes, Training certificate no:',
      'Working Independently (Yes/No). If Yes, Training certificate no:',
      'Working Independently (Yes/No). If Yes, Training certificate no',
    ]);
    const parsed = parseIndependentAndCertificate_(independentRaw);

    const materialFromLabRaw = get([
      'Is material taken from the lab?',
      'Is material taken from lab?',
      'Is materail taken from the lab?',
      'Material from lab',
      'MaterialFromLab',
      'Material required from the lab',
    ]);
    const materialApproxQtyRaw = get([
      'Approximate quantity of the material',
      'Appocimate quantity of the material',
      'Appocimate quantit y of the material',
      'Approximate quantit y of the material',
      'Approximate quantity',
      'Material quantity',
      'MaterialApproxQty',
    ]);
    const materialCombinedRaw = get(['quantity', '<<quantity>>', '<<QUANTITY>>', 'MaterialRequirementSummary']);
    const materialParsed = parseMaterialRequirement_(
      materialFromLabRaw,
      materialApproxQtyRaw,
      materialCombinedRaw
    );

    return {
      createdAtISO: new Date().toISOString(),
      name: name,
      ktuId: ktuId,
      phone: phone,
      email: email,
      semester: semester,
      department: department,
      purpose: purpose,
      date: date,
      timeFrom: timeFrom,
      timeTo: timeTo,
      categories: categories,
      machines: machines,
      itemQty: {},
      totalText: totalText,
      workingIndependently: parsed.independent,
      trainingCertificateNo: parsed.certificate,
      materialFromLab: materialParsed.materialFromLab,
      materialApproxQty: materialParsed.materialApproxQty,
      materialRequirementSummary: materialParsed.materialRequirementSummary,
    };
  }

  function sendConfirmationForBookingRow_(bookingsSheet, rowIndex, opts) {
    opts = opts || {};
    const templateDocId = String(opts.templateDocId || '').trim();
    const root = opts.rootFolder;
    const updateMonthlyArchive = opts.updateMonthlyArchive === true;
    if (!templateDocId) throw new Error('Missing templateDocId');
    if (!root) throw new Error('Missing rootFolder');

    const lastCol = bookingsSheet.getLastColumn();
    const header = bookingsSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const row = bookingsSheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    const idx = indexMap_(header);

    const emailAlready = idx['EmailSentAtISO'] !== undefined
      ? String(bookingsSheet.getRange(rowIndex, idx['EmailSentAtISO'] + 1).getValue() || '').trim()
      : '';
    const calAlready = idx['CalendarSyncedAtISO'] !== undefined
      ? String(bookingsSheet.getRange(rowIndex, idx['CalendarSyncedAtISO'] + 1).getValue() || '').trim()
      : '';
    if (emailAlready && calAlready) {
      return {
        ok: true,
        email: { skipped: true, reason: 'Already sent' },
        calendar: { skipped: true, reason: 'Already synced' },
      };
    }

    const name = String(row[idx['Name']] || '').trim();
    const ktuId = String(row[idx['KTU ID']] || '').trim();
    const semester = String(row[idx['Semester']] || '').trim();
    const dept = String(row[idx['Department']] || '').trim();
    const phone = String(row[idx['Phone']] || row[idx['Phone No']] || '').trim();
    const email = String(row[idx['Email']] || row[idx['Email ID']] || '').trim();
    const des = String(row[idx['Purpose']] || '').trim();
    const equip = String(row[idx['TotalText']] || '').trim();

    const slotDate = normalizeDateValue_(row[idx['Date']]);
    const tf24 = normalizeTimeValue_(row[idx['TimeFrom']]);
    const tt24 = normalizeTimeValue_(row[idx['TimeTo']]);
    const tf12 = formatTime12h_(tf24);
    const tt12 = formatTime12h_(tt24);

    const independent = String(row[idx['WorkingIndependently']] || '').trim();
    const cert = String(row[idx['TrainingCertificateNo']] || '').trim();
    const materialFromLab =
      idx['MaterialFromLab'] !== undefined ? String(row[idx['MaterialFromLab']] || '').trim() : '';
    const materialApproxQty =
      idx['MaterialApproxQty'] !== undefined ? String(row[idx['MaterialApproxQty']] || '').trim() : '';
    const materialSummaryRaw =
      idx['MaterialRequirementSummary'] !== undefined
        ? String(row[idx['MaterialRequirementSummary']] || '').trim()
        : '';
    const materialSummary = materialSummaryRaw ||
      buildMaterialRequirementSummary_(materialFromLab, materialApproxQty);

    if (!slotDate) throw new Error('Booking row missing Date');

    const yyyy = slotDate.slice(0, 4);
    const mm = slotDate.slice(5, 7);
    const dd = slotDate.slice(8, 10);
    const yearFolder = getOrCreateChildFolder_(root, yyyy);
    const monthFolder = getOrCreateChildFolder_(yearFolder, monthFolderName_(yyyy, mm));
    const dayFolder = getOrCreateChildFolder_(monthFolder, dd);

    const tokens = {
      '<<NAME>>': name,
      '<<KTU>>': ktuId,
      '<<SEM>>': semester,
      '<<DEPT>>': dept,
      '<<NUMBER>>': phone,
      '<<DES>>': des,
      '<<EQUI>>': equip,
      '<<DATE>>': slotDate,
      '<<TIMEFROM>>': tf12,
      '<<TIMETO>>': tt12,
      '<<INDEPENDENT>>': independent,
      '<<CERTIFICATE>>': cert,
      '<<quantity>>': materialSummary,
      '<<QUANTITY>>': materialSummary,
    };

    const baseName = buildPdfBaseName_(slotDate, name);
    const result = {
      ok: true,
      email: { skipped: false, sent: false },
      calendar: { skipped: false, synced: false },
    };

    // 1) PDF + Email (only if not already sent)
    if (emailAlready) {
      result.email = { skipped: true, reason: 'Already sent', sent: true };
    } else {
      const templateFile = DriveApp.getFileById(templateDocId);
      let docFile = null;
      try {
        if (!email) throw new Error('Booking row missing Email');

        // Create a temporary Doc copy, export to PDF, then trash the Doc.
        docFile = templateFile.makeCopy(baseName, dayFolder);
        const doc = DocumentApp.openById(docFile.getId());
        try {
          const body = doc.getBody();
          Object.keys(tokens).forEach((token) => {
            body.replaceText(escapeRegexForDocReplace_(token), String(tokens[token] || ''));
          });
        } finally {
          doc.saveAndClose();
        }

        const pdfBlob = DriveApp.getFileById(docFile.getId()).getBlob().setName(baseName + '.pdf');
        const pdfFile = dayFolder.createFile(pdfBlob);

        MailApp.sendEmail({
          to: email,
          subject: 'Tinkerers Lab Slot Booking Confirmation - ' + slotDate,
          body:
            'Hi ' +
            (name || '') +
            ',\n\nYour slot booking is confirmed for ' +
            slotDate +
            (tf12 && tt12 ? ' ' + tf12 + '-' + tt12 : '') +
            '.\n\nPlease find the attached PDF.\n\nThanks,\nTinkerers Lab',
          attachments: [pdfBlob],
        });

        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'EmailSentAtISO', new Date().toISOString());
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'EmailStatus', 'SENT');
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'EmailError', '');
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'PdfFileId', pdfFile.getId());
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'PdfFileUrl', pdfFile.getUrl());
        result.email = { skipped: false, sent: true, pdfFileId: pdfFile.getId(), pdfFileUrl: pdfFile.getUrl() };
      } catch (err) {
        const msg = String(err && err.message ? err.message : err);
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'EmailStatus', 'ERROR');
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'EmailError', msg);
        result.ok = false;
        result.email = { skipped: false, sent: false, error: msg };
      } finally {
        if (docFile) {
          try {
            docFile.setTrashed(true);
          } catch (e) {
            // ignore cleanup errors
          }
        }
      }
    }

    // 2) Calendar sync (only if not already synced)
    if (calAlready) {
      result.calendar = { skipped: true, reason: 'Already synced', synced: true };
    } else {
      try {
        const calResult = syncLabCalendarForBooking_({
          date: slotDate,
          timeFrom: tf24,
          timeTo: tt24,
          machines: String(row[idx['Machines']] || ''),
        });

        if (!calResult || calResult.ok !== true) {
          setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarStatus', 'ERROR');
          setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarError', String(calResult && calResult.error ? calResult.error : 'Calendar sync failed'));
          result.ok = false;
          result.calendar = {
            skipped: false,
            synced: false,
            error: String(calResult && calResult.error ? calResult.error : 'Calendar sync failed'),
          };
        } else {
          setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarSyncedAtISO', new Date().toISOString());
          setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarStatus', 'SYNCED');
          setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarError', '');
          setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarEventIdsJSON', JSON.stringify(calResult.eventIdsByMachine || {}));
          result.calendar = {
            skipped: false,
            synced: true,
            calendarId: calResult.calendarId || '',
            created: Number(calResult.created || 0),
          };
        }
      } catch (err) {
        const msg2 = String(err && err.message ? err.message : err);
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarStatus', 'ERROR');
        setIfColumnExists_(bookingsSheet, rowIndex, idx, 'CalendarError', msg2);
        result.ok = false;
        result.calendar = { skipped: false, synced: false, error: msg2 };
      }
    }

    if (updateMonthlyArchive) {
      archiveSingleMonthFromSheet_(bookingsSheet, slotDate, root);
    }

    return result;
  }

  function formatTime12h_(v) {
    const hhmm = normalizeTimeValue_(v);
    const m = /^([0-2]\d):([0-5]\d)$/.exec(String(hhmm || '').trim());
    if (!m) return String(hhmm || '').trim();
    let h = Number(m[1]);
    const mins = m[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return String(h) + ':' + mins + ' ' + ampm;
  }

  function processUnsentResponses(options) {
    options = options || {};
    const props = PropertiesService.getScriptProperties();
    const templateDocId = String(options.templateDocId || props.getProperty('BOOKING_TEMPLATE_DOC_ID') || '').trim();
    if (!templateDocId) throw new Error('Missing BOOKING_TEMPLATE_DOC_ID');

    const rootFolderId = String(options.rootFolderId || props.getProperty('ARCHIVE_ROOT_FOLDER_ID') || '').trim();
    const rootFolderName = String(options.rootFolderName || props.getProperty('ARCHIVE_ROOT_FOLDER_NAME') || 'TLGECI Bookings Archive');
    const root = getArchiveRootFolder_(rootFolderId, rootFolderName);

    const sheetName = String(options.sheetName || getBookingsSheetName_());
    const limit = options.limit ? Number(options.limit) : 0;

    const ss = SpreadsheetApp.openById(getSpreadsheetId_());
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Missing sheet: ' + sheetName);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return { ok: true, processed: 0, skipped: 0 };

    // Ensure tracking columns exist.
    const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    ensureResponseTrackingColumns_(sheet, header);

    // Refresh header after potential append.
    const header2 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    const idx = indexMap_(header2);
    if (idx['EmailSentAtISO'] === undefined) throw new Error('EmailSentAtISO column not found after ensuring.');

    var processed = 0;
    var skipped = 0;
    for (var r = 2; r <= lastRow; r++) {
      const sentAt = String(sheet.getRange(r, idx['EmailSentAtISO'] + 1).getValue() || '').trim();
      if (sentAt) {
        skipped++;
        continue;
      }
      processResponseRow_(sheet, r, { templateDocId: templateDocId, rootFolder: root });
      processed++;
      if (limit && processed >= limit) break;
    }

    return { ok: true, processed: processed, skipped: skipped };
  }

  function processResponseRow_(sheet, rowIndex, opts) {
    opts = opts || {};
    const templateDocId = String(opts.templateDocId || '').trim();
    const root = opts.rootFolder;
    const updateMonthlyArchive = opts.updateMonthlyArchive === true;
    if (!templateDocId) throw new Error('processResponseRow_: missing templateDocId');
    if (!root) throw new Error('processResponseRow_: missing rootFolder');

    const lastCol = sheet.getLastColumn();
    if (rowIndex < 2 || lastCol < 1) return;

    const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const row = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
    const trackingHeader = ensureResponseTrackingColumns_(sheet, header);
    const idx = indexMap_(trackingHeader);

    // If already processed, skip.
    if (idx['EmailSentAtISO'] !== undefined) {
      const already = String(sheet.getRange(rowIndex, idx['EmailSentAtISO'] + 1).getValue() || '').trim();
      if (already) return;
    }

    try {
      const field = (cands) => getFieldByHeaderCandidates_(trackingHeader, row, cands);

      const email = String(field(['Email ID', 'Email', 'Email Address', 'E-mail', 'Mail']) || '').trim();
      const name = String(field(['Name', 'Full Name', 'Student Name']) || '').trim();
      const slotDateRaw = field([
        'Date of using lab facilities',
        'Date',
        'Slot Date',
        'Booking Date',
        'Date (Slot)',
      ]);
      const slotDate = normalizeDateValue_(slotDateRaw);
      const timeFrom = String(
        field(['Time slot - From', 'TimeFrom', 'Time From', 'From', 'Start Time']) || ''
      ).trim();
      const timeTo = String(
        field(['Time slot - TO', 'Time slot - To', 'TimeTo', 'Time To', 'To', 'End Time']) || ''
      ).trim();
      const ktuId = String(field(['KTU ID', 'KTU', 'KTU Id', 'KTU_ID']) || '').trim();
      const semester = String(field(['Semester', 'SEM', 'Sem']) || '').trim();
      const department = String(field(['Department', 'DEPT', 'Dept']) || '').trim();
      const phone = String(field(['Phone No', 'Phone', 'Phone Number', 'Mobile', 'Mobile Number', 'NUMBER']) || '').trim();
      const description = String(
        field(['Purpose/project description (brief)', 'Project Description', 'Description', 'Purpose', 'DES']) || ''
      ).trim();
      const equipment = String(
        field(['TOTAL ..', 'TOTAL', 'Total', 'TotalText', 'Equipment required', 'Type of materials required', 'EQUI']) || ''
      ).trim();

      const independentRaw = field([
        'Working Independently (Yes/No). If Yes, Training certificate no:',
        'Working Independently (Yes/No). If Yes, Training certificate no',
        'Working Independently',
        'WorkingIndependently',
      ]);
      const parsed = parseIndependentAndCertificate_(independentRaw);
      const independent = parsed.independent;
      const certificate = parsed.certificate;

      const materialFromLabRaw = field([
        'Is material taken from the lab?',
        'Is material taken from lab?',
        'Is materail taken from the lab?',
        'Material from lab',
        'MaterialFromLab',
        'Material required from the lab',
      ]);
      const materialApproxQtyRaw = field([
        'Approximate quantity of the material',
        'Appocimate quantity of the material',
        'Appocimate quantit y of the material',
        'Approximate quantit y of the material',
        'Approximate quantity',
        'Material quantity',
        'MaterialApproxQty',
      ]);
      const materialCombinedRaw = field(['quantity', '<<quantity>>', '<<QUANTITY>>', 'MaterialRequirementSummary']);
      const materialParsed = parseMaterialRequirement_(
        materialFromLabRaw,
        materialApproxQtyRaw,
        materialCombinedRaw
      );
      const materialSummary = materialParsed.materialRequirementSummary;

      if (!email) throw new Error('Email is empty (check your Form question title / column name)');
      if (!slotDate || !/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
        throw new Error('Slot Date is missing/invalid. Ensure a column named Date / Slot Date exists.');
      }

      const yyyy = slotDate.slice(0, 4);
      const mm = slotDate.slice(5, 7);
      const dd = slotDate.slice(8, 10);
      const yearFolder = getOrCreateChildFolder_(root, yyyy);
      const monthFolder = getOrCreateChildFolder_(yearFolder, monthFolderName_(yyyy, mm));
      const dayFolder = getOrCreateChildFolder_(monthFolder, dd);

      const placeholders = {
        '<<NAME>>': name,
        '<<KTU>>': ktuId,
        '<<SEM>>': semester,
        '<<DEPT>>': department,
        '<<NUMBER>>': phone,
        '<<DES>>': description,
        '<<EQUI>>': equipment,
        '<<DATE>>': slotDate,
        '<<TIMEFROM>>': timeFrom,
        '<<TIMETO>>': timeTo,
        '<<INDEPENDENT>>': independent,
        '<<CERTIFICATE>>': certificate,
        '<<quantity>>': materialSummary,
        '<<QUANTITY>>': materialSummary,
      };

      const docName = buildPdfBaseName_(slotDate, name);
      const templateFile = DriveApp.getFileById(templateDocId);
      let docFile = null;
      let pdfBlob = null;
      let pdfFile = null;
      try {
        docFile = templateFile.makeCopy(docName, dayFolder);
        const doc = DocumentApp.openById(docFile.getId());
        try {
          const body = doc.getBody();
          Object.keys(placeholders).forEach((token) => {
            body.replaceText(escapeRegexForDocReplace_(token), String(placeholders[token] || ''));
          });
        } finally {
          doc.saveAndClose();
        }

        pdfBlob = DriveApp.getFileById(docFile.getId()).getBlob().setName(docName + '.pdf');
        pdfFile = dayFolder.createFile(pdfBlob);
      } finally {
        if (docFile) {
          try {
            docFile.setTrashed(true);
          } catch (e) {
            // ignore cleanup errors
          }
        }
      }

      const subject = 'Tinkerers Lab Slot Booking Confirmation - ' + slotDate;
      const mailBody =
        'Hi ' +
        (name || '') +
        ',\n\nYour slot booking is confirmed for ' +
        slotDate +
        (timeFrom && timeTo ? ' ' + timeFrom + '-' + timeTo : '') +
        '.\n\nPlease find the attached PDF.\n\nThanks,\nTinkerers Lab';

      MailApp.sendEmail({
        to: email,
        subject: subject,
        body: mailBody,
        attachments: [pdfBlob],
      });

      setIfColumnExists_(sheet, rowIndex, idx, 'EmailSentAtISO', new Date().toISOString());
      setIfColumnExists_(sheet, rowIndex, idx, 'EmailStatus', 'SENT');
      setIfColumnExists_(sheet, rowIndex, idx, 'PdfFileId', pdfFile.getId());
      setIfColumnExists_(sheet, rowIndex, idx, 'PdfFileUrl', pdfFile.getUrl());
      setIfColumnExists_(sheet, rowIndex, idx, 'EmailError', '');

      // Update monthly sorted spreadsheet for this month on every submission.
      if (updateMonthlyArchive) {
        archiveSingleMonthFromSheet_(sheet, slotDate, root);
      }
    } catch (err) {
      setIfColumnExists_(sheet, rowIndex, idx, 'EmailStatus', 'ERROR');
      setIfColumnExists_(sheet, rowIndex, idx, 'EmailError', String(err && err.message ? err.message : err));
      throw err;
    }
  }

  function archiveSingleMonthFromSheet_(masterSheet, slotDate, rootFolder) {
    const slotDateNorm = normalizeDateValue_(slotDate);
    if (!slotDateNorm || !/^\d{4}-\d{2}-\d{2}$/.test(slotDateNorm)) return;
    const ym = slotDateNorm.slice(0, 7);
    const yyyy = ym.slice(0, 4);
    const mm = ym.slice(5, 7);

    const values = masterSheet.getDataRange().getValues();
    if (values.length < 2) return;

    const header = values[0].map(String);
    let idxDate = findColumnIndexByCandidates_(header, ['Date', 'Date of using lab facilities'], 8);
    let idxFrom = findColumnIndexByCandidates_(
      header,
      ['TimeFrom', 'Time slot - From', 'Time slot - From'],
      9
    );

    const rows = [];
    for (var r = 1; r < values.length; r++) {
      const row = values[r];
      const d = normalizeDateValue_(row[idxDate]);
      if (d && d.slice(0, 7) === ym) rows.push(row);
    }

    const yearFolder = getOrCreateChildFolder_(rootFolder, yyyy);
    const monthFolder = getOrCreateChildFolder_(yearFolder, monthFolderName_(yyyy, mm));
    const fileName = 'Bookings-' + ym;
    const createdOrOpened = getOrCreateSpreadsheetInFolder_(monthFolder, fileName);
    const ss = createdOrOpened.spreadsheet;
    const sheet = ensureSingleSheet_(ss, SHEET_BOOKINGS);
    writeBookingsRows_(sheet, header, rows, { includeHeader: true, idxDate: idxDate, idxFrom: idxFrom });
  }

  function buildPdfBaseName_(yyyyMmDd, name) {
    const safeName = sanitizeFilePart_(name || '');
    const safeDate = String(yyyyMmDd || '').trim();
    const base = safeDate + (safeName ? '_' + safeName : '');
    return base.slice(0, 120);
  }

  function escapeRegexForDocReplace_(s) {
    // DocumentApp.Body.replaceText uses regex.
    return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function ensureResponseTrackingColumns_(sheet, header) {
    const needed = ['EmailSentAtISO', 'EmailStatus', 'EmailError', 'PdfFileId', 'PdfFileUrl'];
    let out = header.slice();
    let changed = false;
    for (var i = 0; i < needed.length; i++) {
      if (indexOfHeader_(out, needed[i]) >= 0) continue;
      out.push(needed[i]);
      changed = true;
    }
    if (!changed) return header;
    sheet.getRange(1, 1, 1, out.length).setValues([out]);
    return out;
  }

  function setIfColumnExists_(sheet, rowIndex, idxMap, colName, value) {
    const i = idxMap[colName];
    if (i === undefined) return;
    sheet.getRange(rowIndex, i + 1).setValue(value);
  }

  function getFieldByHeaderCandidates_(header, row, candidates) {
    for (var i = 0; i < candidates.length; i++) {
      const idx = indexOfHeader_(header, candidates[i]);
      if (idx >= 0) return row[idx];
    }
    return '';
  }

  function findColumnIndexByCandidates_(header, candidates, fallbackIndex) {
    for (var i = 0; i < candidates.length; i++) {
      const idx = indexOfHeader_(header, candidates[i]);
      if (idx >= 0) return idx;
    }
    return typeof fallbackIndex === 'number' ? fallbackIndex : -1;
  }

  function parseIndependentAndCertificate_(raw) {
    const s = String(raw || '').trim();
    if (!s) return { independent: '', certificate: '' };

    // Common patterns:
    // "Yes\nCERT123" | "Yes - CERT123" | "No" | "Yes, CERT123"
    const parts = s
      .split(/\n|,|;|\-|—/g)
      .map((x) => String(x || '').trim())
      .filter(Boolean);

    let independent = '';
    let certificate = '';

    if (parts.length > 0) independent = parts[0];
    if (parts.length > 1) certificate = parts.slice(1).join(' ');

    // If not split nicely, try to extract a likely certificate token.
    if (!certificate && /yes/i.test(independent)) {
      const m = /\b([A-Za-z0-9_-]{4,})\b/.exec(s);
      if (m) certificate = m[1];
    }

    // Normalize independent to Yes/No if possible.
    if (/^y(es)?\b/i.test(independent)) independent = 'Yes';
    else if (/^n(o)?\b/i.test(independent)) independent = 'No';

    return { independent: independent, certificate: certificate };
  }

  function parseMaterialRequirement_(fromLabRaw, approxQtyRaw, combinedRaw) {
    let fromLab = String(fromLabRaw || '').trim();
    let approxQty = String(approxQtyRaw || '').trim();
    const combined = String(combinedRaw || '').trim();

    if ((!fromLab && !approxQty) && combined) {
      if (/^no\b/i.test(combined)) {
        fromLab = 'No';
        approxQty = '';
      } else if (/^yes\b/i.test(combined)) {
        fromLab = 'Yes';
        const mYes = /^yes\s*[-,:]?\s*(.*)$/i.exec(combined);
        approxQty = mYes && mYes[1] ? String(mYes[1]).trim() : '';
      } else {
        const m = /^(yes|no)\s*[-,:]?\s*(.*)$/i.exec(combined);
        if (m) {
          fromLab = /^yes$/i.test(m[1]) ? 'Yes' : 'No';
          approxQty = String(m[2] || '').trim();
        }
      }
    }

    if (/^y(es)?$/i.test(fromLab)) fromLab = 'Yes';
    else if (/^n(o)?$/i.test(fromLab)) fromLab = 'No';

    const materialRequirementSummary = buildMaterialRequirementSummary_(fromLab, approxQty);
    return {
      materialFromLab: fromLab,
      materialApproxQty: approxQty,
      materialRequirementSummary: materialRequirementSummary,
    };
  }

  function indexOfHeader_(header, name) {
    const needle = normalizeHeaderKey_(name);
    for (var i = 0; i < header.length; i++) {
      if (normalizeHeaderKey_(header[i]) === needle) return i;
    }
    return -1;
  }

  function normalizeHeaderKey_(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  function indexMap_(header) {
    const out = {};
    for (var i = 0; i < (header || []).length; i++) {
      const key = String(header[i] || '').trim();
      if (!key) continue;
      if (out[key] === undefined) out[key] = i;
    }
    return out;
  }

  function sanitizeFilePart_(s) {
    return String(s || '')
      .trim()
      .replace(/[\\/:*?"<>|#%&{}\[\]~]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 80);
  }

  function getOrCreateFolderInRoot_(name) {
    const root = DriveApp.getRootFolder();
    const it = root.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return root.createFolder(name);
  }

  function getOrCreateChildFolder_(parentFolder, name) {
    const it = parentFolder.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return parentFolder.createFolder(name);
  }

  function getOrCreateSpreadsheetInFolder_(folder, fileName) {
    const files = folder.getFilesByName(fileName);
    if (files.hasNext()) {
      const file = files.next();
      const ssExisting = SpreadsheetApp.openById(file.getId());
      // If multiple files share the name, we intentionally only return the first.
      return { spreadsheet: ssExisting, existed: true };
    }

    const ssNew = SpreadsheetApp.create(fileName);
    const fileNew = DriveApp.getFileById(ssNew.getId());
    folder.addFile(fileNew);
    // Remove from root to avoid duplicates in My Drive.
    try {
      DriveApp.getRootFolder().removeFile(fileNew);
    } catch (e) {
      // Ignore if not permitted.
    }
    return { spreadsheet: ssNew, existed: false };
  }

  function ensureSingleSheet_(spreadsheet, sheetName) {
    // Ensure there is exactly one sheet, named as desired.
    const sheets = spreadsheet.getSheets();
    let target = spreadsheet.getSheetByName(sheetName);
    if (!target) {
      target = sheets && sheets.length ? sheets[0] : spreadsheet.insertSheet(sheetName);
      target.setName(sheetName);
    }

    // Delete any other sheets.
    const all = spreadsheet.getSheets();
    for (var i = 0; i < all.length; i++) {
      const sh = all[i];
      if (sh.getSheetId() === target.getSheetId()) continue;
      spreadsheet.deleteSheet(sh);
    }
    return target;
  }

  function writeBookingsRows_(sheet, header, rows, opts) {
    opts = opts || {};
    const includeHeader = opts.includeHeader !== false;
    const idxDate = Number(opts.idxDate);
    const idxFrom = Number(opts.idxFrom);

    sheet.clearContents();
    sheet.clearFormats();

    const out = [];
    if (includeHeader) out.push(header);
    for (var i = 0; i < rows.length; i++) out.push(rows[i]);

    if (out.length === 0) return;

    sheet.getRange(1, 1, out.length, out[0].length).setValues(out);
    sheet.setFrozenRows(includeHeader ? 1 : 0);

    // Sort data rows (exclude header).
    if (rows.length > 1) {
      const startRow = includeHeader ? 2 : 1;
      const numRows = rows.length;
      const numCols = out[0].length;
      const range = sheet.getRange(startRow, 1, numRows, numCols);

      // Defensive: only sort if indexes are within column bounds.
      const sortSpecs = [];
      if (isFinite(idxDate) && idxDate >= 0 && idxDate + 1 <= numCols) {
        sortSpecs.push({ column: idxDate + 1, ascending: true });
      }
      if (isFinite(idxFrom) && idxFrom >= 0 && idxFrom + 1 <= numCols) {
        sortSpecs.push({ column: idxFrom + 1, ascending: true });
      }
      if (sortSpecs.length > 0) range.sort(sortSpecs);
    }
  }

  /**
  * Optional: run this once to create a monthly trigger.
  * The trigger will call archiveBookingsToDrive() automatically.
  */
  function setupMonthlyArchiveTrigger() {
    // Avoid duplicate triggers.
    const triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction && triggers[i].getHandlerFunction() === 'archiveBookingsToDrive') {
        return { ok: true, message: 'Trigger already exists.' };
      }
    }

    ScriptApp.newTrigger('archiveBookingsToDrive').timeBased().onMonthDay(1).atHour(1).create();
    return { ok: true, message: 'Monthly trigger created (runs on day 1 at ~1am).' };
  }

  /**
  * Optional: daily automation.
  * Useful when people can book in advance (e.g., next month) and you want the
  * corresponding YYYY/MM folder + Bookings-YYYY-MM file to be created/updated
  * as soon as the master sheet has those rows.
  */
  function setupDailyArchiveTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction && triggers[i].getHandlerFunction() === 'archiveBookingsToDrive') {
        return { ok: true, message: 'A trigger already exists (archiveBookingsToDrive).' };
      }
    }

    ScriptApp.newTrigger('archiveBookingsToDrive').timeBased().everyDays(1).atHour(1).create();
    return { ok: true, message: 'Daily trigger created (runs roughly once a day at ~1am).' };
  }

  /**
  * Remove all time-based triggers that call archiveBookingsToDrive.
  */
  function removeArchiveTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    var removed = 0;
    for (var i = 0; i < triggers.length; i++) {
      const t = triggers[i];
      if (t.getHandlerFunction && t.getHandlerFunction() === 'archiveBookingsToDrive') {
        ScriptApp.deleteTrigger(t);
        removed++;
      }
    }
    return { ok: true, removed: removed };
  }
