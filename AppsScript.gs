/**
 * PushDesk — Google Apps Script
 *
 * HOW TO DEPLOY:
 * 1. Open your Google Sheet
 * 2. Click Extensions → Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click Deploy → New deployment
 *    - Type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone (within Jumia org, or "Anyone" if needed)
 * 5. Authorize the permissions when prompted
 * 6. Copy the Web App URL — it looks like:
 *    https://script.google.com/macros/s/AKfycb.../exec
 * 7. Paste that URL into Vercel as the VITE_APPS_SCRIPT_URL env variable
 *
 * NOTE: Every time you change this script, you must create a NEW deployment
 * (not update existing) for changes to take effect on the live URL.
 */

var SPREADSHEET_ID = "1_cR32Owor2_at23OvNnL9ETlPlJDbfKM7ispp9VvmWs";
var SHEET_GID      = 781126454;

function doGet() {
  try {
    var ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets();

    // Find the correct tab by GID
    var sheet  = null;
    for (var i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === SHEET_GID) {
        sheet = sheets[i];
        break;
      }
    }

    // Fallback to active sheet if GID not found
    if (!sheet) sheet = ss.getActiveSheet();

    var data   = sheet.getDataRange().getValues();
    var output = ContentService
      .createTextOutput(JSON.stringify({ data: data, sheet: sheet.getName() }))
      .setMimeType(ContentService.MimeType.JSON);

    return output;

  } catch (e) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: e.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Required for CORS preflight requests from the browser
function doOptions() {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}
