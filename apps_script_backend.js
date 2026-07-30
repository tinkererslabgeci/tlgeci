/**
 * TL GECI Slot Booking - Admin Approval Backend
 * 
 * Instructions:
 * 1. Open your Google Apps Script project.
 * 2. Paste this code, replacing your existing code (or merge if you have custom logic).
 * 3. Update the Configuration Constants below.
 * 4. Deploy as a Web App (Execute as: Me, Who has access: Anyone).
 */

// ==========================================
// CONFIGURATION CONSTANTS
// ==========================================
const SHEET_NAME = 'Bookings'; 
// Comma-separated list of admin emails (e.g. 'admin1@gecidukki.ac.in, admin2@gecidukki.ac.in')
const DEFAULT_ADMIN_EMAILS = 'tinkererslabgeci@gecidukki.ac.in'; 
const PDF_TEMPLATE_DOC_ID = 'YOUR_GOOGLE_DOC_TEMPLATE_ID'; // Ensure this doc has <<Admin_Name>> placeholder
const PDF_TEMP_FOLDER_ID = 'YOUR_TEMP_FOLDER_ID'; // Optional: Folder to store generated PDFs temporarily

function getAdminEmails() {
  const prop = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS');
  if (prop && prop.trim()) {
    return prop.trim();
  }
  return DEFAULT_ADMIN_EMAILS;
}

// ==========================================
// CORE FUNCTIONS
// ==========================================

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    // ==========================================
    // 1. ADMIN ACTION (APPROVE / REJECT)
    // ==========================================
    if (payload.adminAction) {
      return handleAdminAction(payload);
    }
    
    // ==========================================
    // 2. NEW BOOKING SUBMISSION
    // ==========================================
    if (payload.commit && payload.booking) {
      return handleNewBooking(payload.booking);
    }
    
    // ==========================================
    // 3. AVAILABILITY CHECK (Optional/Dummy for now)
    // ==========================================
    if (payload.booking && !payload.commit) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    throw new Error("Invalid payload format");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    // Check for CORS preflight
    if (!e || !e.parameter) {
      return ContentService.createTextOutput("System is running.").setMimeType(ContentService.MimeType.TEXT);
    }
    
    if (e.parameter.action === 'getAll') {
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        bookings: getAllBookings()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput("System is running.").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// HANDLERS
// ==========================================

function handleNewBooking(booking) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  
  // Create headers if not exists
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'ID', 'Timestamp', 'Status', 'Approved By', 'Rejection Reason', 
      'Name', 'Email', 'KTU ID', 'Phone', 'Semester', 'Department', 
      'Date', 'Time From', 'Time To', 'Purpose', 'Total Equipments'
    ]);
  }
  
  // Append new row as PENDING
  sheet.appendRow([
    booking.id,
    new Date(),
    'PENDING', // Status
    '', // Approved By
    '', // Rejection Reason
    booking.name,
    booking.email,
    booking.ktuId,
    booking.phone,
    booking.semester,
    booking.department,
    booking.date,
    booking.timeFrom,
    booking.timeTo,
    booking.purpose,
    booking.totalText
  ]);
  
  // Send notification to admin
  const adminMsg = `New Slot Booking Request from ${booking.name}.\n\n` +
                   `Date: ${booking.date}\nTime: ${booking.timeFrom} - ${booking.timeTo}\n` +
                   `Purpose: ${booking.purpose}\n\n` +
                   `Please log in to the Admin Dashboard to approve or reject this request.`;
  
  try {
    MailApp.sendEmail({
      to: getAdminEmails(),
      subject: `New Booking Request - ${booking.name}`,
      body: adminMsg
    });
  } catch (e) {
    // Ignore email errors to not fail the booking
  }
  
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAdminAction(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const idIndex = headers.indexOf('ID');
  const statusIndex = headers.indexOf('Status');
  const approvedByIndex = headers.indexOf('Approved By');
  const reasonIndex = headers.indexOf('Rejection Reason');
  
  if (idIndex === -1) throw new Error("Could not find ID column in sheet");
  
  let rowIndex = -1;
  let bookingData = {};
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === payload.bookingId) {
      rowIndex = i + 1; // +1 because rows are 1-indexed
      // Map row to object
      headers.forEach((h, colIdx) => {
        bookingData[h] = data[i][colIdx];
      });
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error("Booking not found");
  
  // Update Sheet
  sheet.getRange(rowIndex, statusIndex + 1).setValue(payload.action);
  sheet.getRange(rowIndex, approvedByIndex + 1).setValue(payload.adminName);
  sheet.getRange(rowIndex, reasonIndex + 1).setValue(payload.rejectionReason);
  
  // Handle Emails
  if (payload.action === 'APPROVE') {
    generatePdfAndSend(bookingData, payload.adminName);
  } else if (payload.action === 'REJECT') {
    sendRejectionEmail(bookingData, payload.rejectionReason, payload.adminName);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAllBookings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const bookings = [];
  
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let b = {};
    // Map headers to object keys safely
    b.id = row[headers.indexOf('ID')] || '';
    b.status = row[headers.indexOf('Status')] || 'PENDING';
    b.approvedBy = row[headers.indexOf('Approved By')] || '';
    b.rejectionReason = row[headers.indexOf('Rejection Reason')] || '';
    b.name = row[headers.indexOf('Name')] || '';
    b.email = row[headers.indexOf('Email')] || '';
    b.date = row[headers.indexOf('Date')] || '';
    b.timeFrom = row[headers.indexOf('Time From')] || '';
    b.timeTo = row[headers.indexOf('Time To')] || '';
    b.purpose = row[headers.indexOf('Purpose')] || '';
    b.department = row[headers.indexOf('Department')] || '';
    b.semester = row[headers.indexOf('Semester')] || '';
    b.totalText = row[headers.indexOf('Total Equipments')] || '';
    
    // Format date properly if it's a Date object
    if (b.date instanceof Date) {
      b.date = Utilities.formatDate(b.date, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    
    // Format time from/to properly if Date objects
    if (b.timeFrom instanceof Date) {
      b.timeFrom = Utilities.formatDate(b.timeFrom, Session.getScriptTimeZone(), "HH:mm");
    }
    if (b.timeTo instanceof Date) {
      b.timeTo = Utilities.formatDate(b.timeTo, Session.getScriptTimeZone(), "HH:mm");
    }
    
    // Skip empty rows (where ID is missing)
    if (b.id) {
      bookings.push(b);
    }
  }
  
  return bookings;
}

// ==========================================
// EMAIL & PDF HELPERS
// ==========================================

function generatePdfAndSend(bookingData, adminName) {
  try {
    if (PDF_TEMPLATE_DOC_ID === 'YOUR_GOOGLE_DOC_TEMPLATE_ID') {
       // Fallback email without PDF if not configured
       const msg = `Hi ${bookingData['Name']},\n\nYour slot booking for ${bookingData['Date']} has been APPROVED by ${adminName}.\n\nThank you,\nTL GECI`;
       MailApp.sendEmail({
         to: bookingData['Email'],
         subject: "Slot Booking Approved - TL GECI",
         body: msg
       });
       return;
    }
    
    // Copy template
    const templateFile = DriveApp.getFileById(PDF_TEMPLATE_DOC_ID);
    const tempFolder = PDF_TEMP_FOLDER_ID !== 'YOUR_TEMP_FOLDER_ID' ? DriveApp.getFolderById(PDF_TEMP_FOLDER_ID) : DriveApp.getRootFolder();
    const tempFile = templateFile.makeCopy(`Booking_Confirmation_${bookingData['Name']}`, tempFolder);
    const tempDoc = DocumentApp.openById(tempFile.getId());
    const body = tempDoc.getBody();
    
    // Replace Placeholders (Add or remove based on your actual doc)
    body.replaceText("<<Name>>", bookingData['Name'] || '');
    
    let dateStr = bookingData['Date'];
    if (dateStr instanceof Date) {
        dateStr = Utilities.formatDate(dateStr, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    let timeFromStr = bookingData['Time From'] || bookingData['TimeFrom'];
    if (timeFromStr instanceof Date) {
        timeFromStr = Utilities.formatDate(timeFromStr, Session.getScriptTimeZone(), "HH:mm");
    }
    let timeToStr = bookingData['Time To'] || bookingData['TimeTo'];
    if (timeToStr instanceof Date) {
        timeToStr = Utilities.formatDate(timeToStr, Session.getScriptTimeZone(), "HH:mm");
    }

    body.replaceText("<<Date>>", String(dateStr || ''));
    body.replaceText("<<Time>>", `${timeFromStr || ''} - ${timeToStr || ''}`);
    body.replaceText("<<Equipments>>", bookingData['Total Equipments'] || '');
    body.replaceText("<<Admin_Name>>", adminName || '');
    
    tempDoc.saveAndClose();
    
    // Convert to PDF
    const pdfBlob = tempFile.getAs(MimeType.PDF);
    
    // Send Email
    const msg = `Hi ${bookingData['Name']},\n\nYour slot booking has been APPROVED by ${adminName}.\n\nPlease find your confirmation attached.\n\nThank you,\nTL GECI`;
    
    MailApp.sendEmail({
      to: bookingData['Email'],
      subject: "Slot Booking Approved - TL GECI",
      body: msg,
      attachments: [pdfBlob]
    });
    
    // Clean up temp file
    tempFile.setTrashed(true);
    
  } catch(e) {
    console.error("Error generating PDF: " + e.toString());
    // Fallback email without PDF
    const msg = `Hi ${bookingData['Name']},\n\nYour slot booking for ${bookingData['Date']} has been APPROVED by ${adminName}.\n\nThank you,\nTL GECI`;
    MailApp.sendEmail({
      to: bookingData['Email'],
      subject: "Slot Booking Approved - TL GECI",
      body: msg
    });
  }
}

function sendRejectionEmail(bookingData, reason, adminName) {
  const msg = `Hi ${bookingData['Name']},\n\nUnfortunately, your slot booking for ${bookingData['Date']} has been REJECTED by ${adminName}.\n\nReason: ${reason}\n\nPlease contact us if you have any questions.\n\nThank you,\nTL GECI`;
  
  try {
    MailApp.sendEmail({
      to: bookingData['Email'],
      subject: "Slot Booking Update - TL GECI",
      body: msg
    });
  } catch(e) {
    console.error("Error sending rejection email: " + e.toString());
  }
}
