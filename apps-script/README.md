 # Slot booking: Google Sheet conflict + inventory API (Apps Script)

This folder contains a Google Apps Script web app you can deploy as a lightweight backend.

## What it does
- Reads existing bookings from a Google Sheet.
- Checks **machine time-slot overlap** conflicts.
- Checks **quantity availability** for tools / power tools (time-slot based) and electronic components (stock based).
- Returns:
  - `ok: true/false`
  - `conflicts` with details
  - `inventoryLeft` (after considering current bookings)
  - `suggestions` for next available time slot

## Setup (Google)
1. Open your Google Sheet that stores responses (this is the **master sheet**).
2. Create two tabs:
   - `Bookings` (bookings rows written by the script)
   - `Inventory` (your stock counts)
3. Open https://script.google.com/ → New project.
4. Paste [apps-script/Code.gs](apps-script/Code.gs) into the project.
5. Set the spreadsheet id:
   - Recommended: **Project Settings** → Script Properties → add `SPREADSHEET_ID` = your master sheet id
   - Or edit the `SPREADSHEET_ID` constant at the top of the file

### Inventory tab format
Header row (row 1):
- `Item` (exact option text, e.g. `ARDUINO UNO`)
- `Type` (`component` | `tool` | `powerTool`)
- `Total` (number)

Example rows:
- `ARDUINO UNO`, `component`, `10`
- `HAND DRILL`, `powerTool`, `2`
- `VERNIER`, `tool`, `3`

### Bookings tab format
The script will write this automatically with these columns:
- `CreatedAtISO`
- `Name`
- `KTU ID`
- `Phone`
- `Email`
- `Semester`
- `Department`
- `Purpose`
- `Date` (yyyy-mm-dd)
- `TimeFrom` (HH:MM)
- `TimeTo` (HH:MM)
- `Categories` (comma-separated)
- `Machines` (comma-separated)
- `ItemQuantitiesJSON` (JSON string of `{ itemName: qty }`)
- `TotalText` (the raw long-answer text, e.g. `ARDUINO UNO x2, HAND DRILL x1`)
- `WorkingIndependently`
- `TrainingCertificateNo`
- `MaterialFromLab`
- `MaterialApproxQty`
- `MaterialFilamentMeters`
- `MaterialRequirementSummary`

## Deploy
1. Go to https://script.google.com/ and create a new project.
2. Paste `Code.gs` from this folder.
3. Set `SPREADSHEET_ID` at the top.
4. Deploy → **New deployment** → **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (or **Anyone with the link**)
5. Copy the Web App URL.

## Next
Once you share the Web App URL, we can update the React page to:
- fetch inventory left (to show “X left”)
- require quantity inputs for selected items
- block submit when conflicts exist
- show next-slot suggestions

## Note about using one spreadsheet file
Yes: keep everything inside the same Google Sheets file (same `SPREADSHEET_ID`) by using separate tabs:
- `Inventory`
- `Bookings`

## Optional: auto-archive bookings into Drive folders (Year/Month)
If you want to keep **one master sheet** but also generate **monthly files**, `Code.gs` includes a helper that:
- Reads the master `Bookings` tab
- Groups rows by `YYYY-MM` from the `Date` column (this is the slot date)
- Creates Drive folders: `TLGECI Bookings Archive/YYYY/<MonthName>/` (example: `2026/February/`)
- Creates/updates a monthly spreadsheet file: `Bookings-YYYY-MM`
- Sorts rows by `Date` (slot date) then `TimeFrom`

### How to run
You run this from the **Apps Script editor** (not from your React app).

1. Open the Apps Script project.
2. In the top toolbar function dropdown, select `archiveBookingsToDrive`.
3. Click **Run**.
4. Approve permissions (this uses `DriveApp` + `SpreadsheetApp`).

The function returns a JSON-ish object with created months and IDs in the Logs.

### Change the output folder name (optional)
You can run it with options:
```js
archiveBookingsToDrive({ rootFolderName: 'My Archive Folder' });
```

### Select a specific destination folder (recommended)
If you want the archive inside a specific Drive folder (or Shared Drive folder):

1. Create/open the destination folder in Google Drive.
2. Copy the folder id from the URL.
   - Example URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`
3. Run:
```js
archiveBookingsToDrive({ rootFolderId: '<FOLDER_ID>' });
```

If `rootFolderId` is provided and accessible, the script will create `YYYY/MM` folders inside that folder.

### Optional monthly automation
"Monthly automation" means: Apps Script creates a **time-based trigger** that runs automatically (you don’t need to click Run).
To create a time-based trigger that runs on the 1st of every month:
```js
setupMonthlyArchiveTrigger();
```

### If users can book 1 month ahead
That’s fine. The archive is based on the **slot `Date`** column.

- If you run `archiveBookingsToDrive()` today, and there are already rows for next month, it will create next month’s `YYYY/MM` folder + `Bookings-YYYY-MM` file immediately.
- If you use the **monthly trigger**, next month’s file will only be created/updated when the trigger runs (day 1).

If you want next-month folders/files to appear as soon as anyone books ahead, use a **daily** trigger instead:
```js
setupDailyArchiveTrigger();
```

To remove the automation triggers (if you created the wrong one):
```js
removeArchiveTriggers();
```

## Google Forms: generate PDF + store in YYYY/MM/DD + email (automatic)
If your data collection is via **Google Forms**, you can still do fully automatic:
- Create Drive folders `YYYY/<MonthName>/DD` (based on the slot `Date` column)
- Generate a PDF from a Google Docs template (the script uses a temporary Doc copy internally and trashes it after the PDF is created)
- Store the PDF inside the day folder
- Email the PDF to the respondent

### 1) Keep Form Responses separate from Bookings (recommended)
- Let Google Forms continue writing into `Form Responses 1`.
- Create/keep a separate tab named `Bookings`.

The script will:
- READ the newly submitted row from `Form Responses 1`
- WRITE a normalized row into `Bookings`
- Generate PDF + email using the `Bookings` row

Set this Script Property so the trigger only runs for the Form sheet:
- `FORM_RESPONSES_SHEET_NAME` = `Form Responses 1`

If your Bookings tab name is different, set:
- `BOOKINGS_SHEET_NAME` = `Bookings`

### 2) Create a Google Docs template
Create a Google Doc and add placeholders (angle brackets):

Use these placeholders (exactly like this):
- `<<NAME>>`
- `<<KTU>>`
- `<<SEM>>`, `<<DEPT>>`
- `<<NUMBER>>`
- `<<DES>>` (project description)
- `<<EQUI>>` (equipment required / total text)
- `<<DATE>>`
- `<<TIMEFROM>>`, `<<TIMETO>>`
- `<<INDEPENDENT>>`
- `<<CERTIFICATE>>`

### 3) Set Script Properties
Apps Script → Project Settings → Script Properties:
- `SPREADSHEET_ID` = the response spreadsheet id
- `BOOKING_TEMPLATE_DOC_ID` = your template Google Doc file id
- `ARCHIVE_ROOT_FOLDER_ID` = destination Drive folder id (this will be the **same root** used by both archiving and PDF/email storage)
- (Optional) `ARCHIVE_ROOT_FOLDER_NAME` = fallback folder name in My Drive (default: `TLGECI Bookings Archive`)
 - (Recommended) `FORM_RESPONSES_SHEET_NAME` = `Form Responses 1`
- (Required for auto-calendar) `LAB_CALENDAR_ID` = the Google Calendar id where machine bookings will be created

Calendar behavior:
- Single calendar
- One event per selected machine
- Event title is the machine name and time is the booked slot
- No student details are written into calendar events

### 4) Enable automatic processing on every new response
In Apps Script editor, run once:
```js
setupFormSubmitTrigger();
```

From now on, every new Form response will be processed.

Also, the script will update the monthly sorted spreadsheet for that submission’s month automatically.

### What the script writes back into the response sheet
It auto-adds these columns (if missing) and fills them per row:
- `EmailSentAtISO`
- `EmailStatus` (`SENT` or `ERROR`)
- `EmailError`
- `PdfFileId`, `PdfFileUrl`

### File + folder naming
- Month folder is the month name: `February`, `March`, etc.
- Day folder is the day number inside the month folder.
- PDF base name is: `YYYY-MM-DD_Student Name`

Time formatting in the PDF uses 12-hour format (example: `4:30 PM`).

### If your column names differ
The script tries common column names like `Email` / `Email Address`, `Name` / `Full Name`, `Date` / `Slot Date`.
If your Form question titles are very different, rename the columns in the response sheet to match.

### Mapping (based on your headings)
These sheet columns are used to fill your Google Doc template tokens:
- `Name` → `<<NAME>>`
- `KTU ID` → `<<KTU>>`
- `Semester` → `<<SEM>>`
- `Department` → `<<DEPT>>`
- `Phone No` → `<<NUMBER>>`
- `Purpose/project description (brief)` → `<<DES>>`
- `TOTAL` / `TOTAL ..` → `<<EQUI>>`
- `Date of using lab facilities` → `<<DATE>>`
- `Time slot - From` → `<<TIMEFROM>>`
- `Time slot - TO` → `<<TIMETO>>`
- `Working Independently (Yes/No)...` → `<<INDEPENDENT>>` and `<<CERTIFICATE>>` (the script splits Yes/No and certificate if present)
- `Approximate filament required (meters)` (if present) → stored as `MaterialFilamentMeters` in `Bookings`

### Remove the trigger (if needed)
```js
removeFormSubmitTriggers();
```

### If your `Bookings` and `Form Responses 1` got mixed by mistake
If earlier configuration caused booking rows to be written into `Form Responses 1`, do this:

1) Run this to remove the old trigger:
```js
removeFormSubmitTriggers();
```

2) Set Script Properties:
- `FORM_RESPONSES_SHEET_NAME` = `Form Responses 1`
- `BOOKINGS_SHEET_NAME` = `Bookings`

3) (Optional) Copy old responses into `Bookings` safely (does not delete anything):
```js
migrateFormResponsesToBookings();
```

4) Recreate the trigger:
```js
setupFormSubmitTrigger();
```

### If some entries were missed / failed
If a trigger failed (quota, permissions, template error), you can safely re-run a catch-up.
It only processes rows where `EmailSentAtISO` is empty.

```js
processUnsentResponses();
```

Optional: limit how many rows to process in one run:
```js
processUnsentResponses({ limit: 20 });
```
