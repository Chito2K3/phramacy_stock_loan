/**
 * ============================================================================
 * PHARMACY STORAGE INVENTORY & EXPIRY MANAGEMENT SYSTEM
 * Google Apps Script Backend (Code.gs)
 * ============================================================================
 */

// Target or active sheet configuration
const CONFIG = {
  MAIN_SHEET_NAME: null, // null will auto-detect active inventory sheet or look for standard headers
  LOG_SHEET_NAME: 'STOCK_OUT_LOG',
  COLUMN_KEYS: {
    CODE: 'ITEM CODE',
    DESC: 'ITEM DESCRIPTION',
    QTY: 'QTY STORAGE',
    EXP: 'EXP DATE'
  }
};

/**
 * Automatically creates custom menu on spreadsheet open
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏥 Pharmacy Expiry Monitoring')
    .addItem('🚀 Open Inventory Manager (Sidebar)', 'showSidebar')
    .addItem('🖥️ Open Inventory Manager (Full Dialog)', 'showDialog')
    .addSeparator()
    .addItem('➖ Quick Stock-Out / Dispense', 'showStockOutDialog')
    .addItem('➕ Add Medicine or New Batch', 'showAddBatchDialog')
    .addItem('🔄 Restock 0-Qty Items', 'showRestockDialog')
    .addSeparator()
    .addItem('📋 View Stock-Out Audit Log', 'openLogSheet')
    .addToUi();
}

/**
 * Web App entrypoint (for standalone web app deployment)
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Pharmacy Expiry Monitoring - ARMMC')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Shows the application in the Google Sheets Sidebar
 */
function showSidebar() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Pharmacy Expiry Monitoring - ARMMC');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Shows the application in a large Modal Dialog
 */
function showDialog() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setWidth(1150)
    .setHeight(780);
  SpreadsheetApp.getUi().showModalDialog(html, '🏥 Pharmacy Expiry Monitoring - Amang Rodriguez Memorial Medical Center');
}

function showStockOutDialog() {
  showDialog();
}
function showAddBatchDialog() {
  showDialog();
}
function showRestockDialog() {
  showDialog();
}

/**
 * Helper to include HTML sub-files (CSS, JS)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Navigates or focuses on the STOCK_OUT_LOG sheet
 */
function openLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
  if (!logSheet) {
    logSheet = initLogSheet(ss);
  }
  ss.setActiveSheet(logSheet);
}

/**
 * Resolves the primary Inventory sheet and locates its headers
 */
function getInventorySheetInfo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = null;

  if (CONFIG.MAIN_SHEET_NAME) {
    sheet = ss.getSheetByName(CONFIG.MAIN_SHEET_NAME);
  }
  
  if (!sheet) {
    // Try to find the sheet that has ITEM CODE header
    const sheets = ss.getSheets();
    for (let s of sheets) {
      if (s.getName() === CONFIG.LOG_SHEET_NAME) continue;
      const data = s.getDataRange().getValues();
      if (data.length > 0) {
        const headerRow = data[0].map(c => String(c).trim().toUpperCase());
        if (headerRow.some(h => h.includes('ITEM CODE') || h.includes('ITEM_CODE'))) {
          sheet = s;
          break;
        }
      }
    }
  }

  if (!sheet) {
    sheet = ss.getSheets()[0]; // Fallback to first sheet
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length === 0) {
    throw new Error("Inventory sheet is empty.");
  }

  // Find column indices
  const headerRow = values[0];
  let colCode = -1, colDesc = -1, colQty = -1, colExp = -1;

  for (let j = 0; j < headerRow.length; j++) {
    const h = String(headerRow[j]).trim().toUpperCase();
    if (colCode === -1 && (h.includes('CODE') || h.includes('ITEM CODE'))) colCode = j;
    if (colDesc === -1 && (h.includes('DESC') || h.includes('DESCRIPTION'))) colDesc = j;
    if (colQty === -1 && (h.includes('QTY') || h.includes('STORAGE'))) colQty = j;
    if (colExp === -1 && (h.includes('EXP') || h.includes('DATE'))) colExp = j;
  }

  // Default fallbacks if standard 4-column layout
  if (colCode === -1) colCode = 0;
  if (colDesc === -1) colDesc = 1;
  if (colQty === -1) colQty = 2;
  if (colExp === -1) colExp = 3;

  return {
    sheet: sheet,
    sheetName: sheet.getName(),
    values: values,
    colCode: colCode,
    colDesc: colDesc,
    colQty: colQty,
    colExp: colExp
  };
}

/**
 * Fetches all inventory records with parsed quantities, row numbers, and expiry status
 */
function getInventoryData() {
  try {
    const info = getInventorySheetInfo();
    const rows = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    for (let i = 1; i < info.values.length; i++) {
      const row = info.values[i];
      const code = String(row[info.colCode] || '').trim();
      if (!code) continue; // Skip empty rows

      const desc = String(row[info.colDesc] || '').trim();
      const rawQty = row[info.colQty];
      const rawExpVal = row[info.colExp];

      // Clean quantity
      let cleanQty = 0;
      if (typeof rawQty === 'number') {
        cleanQty = rawQty;
      } else {
        const parsed = String(rawQty).replace(/[^0-9.-]/g, '');
        cleanQty = parsed ? parseFloat(parsed) : 0;
      }

      // Parse expiration robustly (handles Date objects, timestamps, strings like 'Feb-27' or '2027-02-01')
      let expYear = null;
      let expLabel = 'NO EXPIRY';
      const ssTz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

      if (rawExpVal instanceof Date) {
        // Use Spreadsheet timezone to prevent server 1-day/month offset
        expLabel = Utilities.formatDate(rawExpVal, ssTz, 'MMM-yy');
        expYear = parseInt(Utilities.formatDate(rawExpVal, ssTz, 'yyyy'), 10);
      } else if (rawExpVal) {
        const strExp = String(rawExpVal).trim();
        // Check for format MMM-yy (e.g. Feb-27, May-30)
        const matchShort = strExp.match(/^([A-Za-z]{3})-(\d{2})$/);
        if (matchShort) {
          expYear = 2000 + parseInt(matchShort[2], 10);
          const m = matchShort[1].charAt(0).toUpperCase() + matchShort[1].slice(1).toLowerCase();
          expLabel = `${m}-${matchShort[2]}`;
        } else {
          // Check if parsable as Date
          const parsedD = new Date(strExp);
          if (!isNaN(parsedD.getTime()) && strExp.length > 8) {
            expLabel = Utilities.formatDate(parsedD, ssTz, 'MMM-yy');
            expYear = parseInt(Utilities.formatDate(parsedD, ssTz, 'yyyy'), 10);
          } else {
            const matchYr = strExp.match(/20(\d{2})/);
            if (matchYr) {
              expYear = 2000 + parseInt(matchYr[1], 10);
            }
            expLabel = strExp || 'NO EXPIRY';
          }
        }
      }

      let expStatus = 'SAFE'; // CRITICAL_2026, NEAR_2027, SAFE, EXPIRED, NO_EXPIRY
      if (!expYear) {
        expStatus = 'NO_EXPIRY';
      } else if (expYear < 2026) {
        expStatus = 'EXPIRED';
      } else if (expYear === 2026) {
        expStatus = 'CRITICAL_2026';
      } else if (expYear === 2027) {
        expStatus = 'NEAR_2027';
      } else {
        expStatus = 'SAFE';
      }

      const isDonation = code.startsWith('DMDON') || code.startsWith('DMCSP');

      rows.push({
        rowIndex: i + 1, // 1-based row index in Google Sheet
        itemCode: code,
        itemDesc: desc,
        qty: cleanQty,
        expDate: expLabel,
        expYear: expYear,
        expStatus: expStatus,
        isDonation: isDonation,
        isZeroStock: cleanQty <= 0
      });
    }

    return {
      success: true,
      sheetName: info.sheetName,
      totalCount: rows.length,
      items: rows
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Smart Add Medicine or New Batch
 * If itemCode exists, finds the last occurrence and inserts a row directly below it!
 * If itemCode does not exist, appends to the end of the inventory list.
 */
function addNewMedicineOrBatch(payload) {
  try {
    const { itemCode, itemDesc, qty, expDate } = payload;
    if (!itemCode || !itemDesc) {
      throw new Error("Item Code and Description are required.");
    }

    const cleanCode = String(itemCode).trim();
    const cleanDesc = String(itemDesc).trim();
    const cleanQty = parseFloat(String(qty).replace(/[^0-9.-]/g, '')) || 0;
    const cleanExp = String(expDate || '').trim();

    const info = getInventorySheetInfo();
    const sheet = info.sheet;
    const values = info.values;

    // Search for existing item occurrences
    let lastMatchingRowIndex = -1;
    let existingCount = 0;

    for (let i = 1; i < values.length; i++) {
      const code = String(values[i][info.colCode] || '').trim().toUpperCase();
      if (code === cleanCode.toUpperCase()) {
        lastMatchingRowIndex = i + 1; // 1-based index in sheet
        existingCount++;
      }
    }

    let insertedRowIndex = -1;
    let mode = '';

    if (lastMatchingRowIndex !== -1) {
      // Existing item: Insert directly below the last existing batch row
      sheet.insertRowAfter(lastMatchingRowIndex);
      insertedRowIndex = lastMatchingRowIndex + 1;
      mode = `Added as new batch #${existingCount + 1} below row ${lastMatchingRowIndex}`;
    } else {
      // New item: Append to the end of sheet
      insertedRowIndex = sheet.getLastRow() + 1;
      mode = `Added as brand new medicine at row ${insertedRowIndex}`;
    }

    // Set values and explicit alignments for the new row
    const ssTz = sheet.getParent().getSpreadsheetTimeZone();
    const formattedExp = normalizeExpiryString(cleanExp, ssTz);

    // Item Code (Left)
    sheet.getRange(insertedRowIndex, info.colCode + 1)
      .setValue(cleanCode)
      .setHorizontalAlignment('left');

    // Item Description (Left)
    sheet.getRange(insertedRowIndex, info.colDesc + 1)
      .setValue(cleanDesc)
      .setHorizontalAlignment('left');

    // Storage Quantity (Right aligned, formatted as #,##0)
    sheet.getRange(insertedRowIndex, info.colQty + 1)
      .setValue(cleanQty)
      .setNumberFormat('#,##0')
      .setHorizontalAlignment('right');
    
    // Expiry Date (Plain text '@' centered to avoid timezone date shifts)
    sheet.getRange(insertedRowIndex, info.colExp + 1)
      .setNumberFormat('@')
      .setValue(formattedExp)
      .setHorizontalAlignment('center');

    return {
      success: true,
      message: `Successfully saved: [${cleanCode}] ${cleanDesc}`,
      mode: mode,
      insertedRowIndex: insertedRowIndex
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Normalizes expiry strings (e.g. "may-30" -> "May-30") and handles Date objects using Spreadsheet timezone
 */
function normalizeExpiryString(inputVal, tz) {
  if (!inputVal) return 'NO EXPIRY';
  if (inputVal instanceof Date) {
    return Utilities.formatDate(inputVal, tz || Session.getScriptTimeZone(), 'MMM-yy');
  }
  const str = String(inputVal).trim();
  if (!str) return 'NO EXPIRY';

  // Format: MMM-yy (e.g. May-30, Feb-27, Dec-28)
  const match = str.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (match) {
    const m = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    return `${m}-${match[2]}`;
  }

  // Format: MMM-yyyy (e.g. May-2030)
  const match4 = str.match(/^([A-Za-z]{3})-(\d{4})$/);
  if (match4) {
    const m = match4[1].charAt(0).toUpperCase() + match4[1].slice(1).toLowerCase();
    return `${m}-${match4[2].slice(-2)}`;
  }

  return str;
}

/**
 * Records Stock-Out (Deduction of Quantity)
 * Reduces QTY STORAGE and logs transaction into STOCK_OUT_LOG sheet
 */
function recordStockOut(payload) {
  try {
    const { rowIndex, itemCode, qtyOut, remarks, user } = payload;
    const deductQty = parseFloat(qtyOut);

    if (isNaN(deductQty) || deductQty <= 0) {
      throw new Error("Quantity out must be a positive number.");
    }

    const info = getInventorySheetInfo();
    const sheet = info.sheet;

    // Validate row
    const targetCode = String(sheet.getRange(rowIndex, info.colCode + 1).getValue()).trim();
    if (targetCode.toUpperCase() !== String(itemCode).trim().toUpperCase()) {
      throw new Error(`Row mismatch! Expected ${itemCode} but found ${targetCode} at row ${rowIndex}. Please refresh list.`);
    }

    const desc = String(sheet.getRange(rowIndex, info.colDesc + 1).getValue()).trim();
    const expDate = String(sheet.getRange(rowIndex, info.colExp + 1).getValue()).trim();
    const rawCurrentQty = sheet.getRange(rowIndex, info.colQty + 1).getValue();
    const currentQty = typeof rawCurrentQty === 'number' ? rawCurrentQty : (parseFloat(String(rawCurrentQty).replace(/[^0-9.-]/g, '')) || 0);

    if (deductQty > currentQty) {
      throw new Error(`Cannot deduct ${deductQty.toLocaleString()} units! Current storage only has ${currentQty.toLocaleString()} units.`);
    }

    const newQty = currentQty - deductQty;

    // Update sheet
    sheet.getRange(rowIndex, info.colQty + 1)
      .setValue(newQty)
      .setNumberFormat('#,##0')
      .setHorizontalAlignment('right');

    // Log the transaction
    logStockOutTransaction({
      timestamp: new Date(),
      itemCode: targetCode,
      itemDesc: desc,
      expDate: expDate,
      qtyOut: deductQty,
      previousQty: currentQty,
      remainingBalance: newQty,
      remarks: remarks || 'Normal Dispense',
      user: user || Session.getActiveUser().getEmail() || 'User'
    });

    return {
      success: true,
      itemCode: targetCode,
      itemDesc: desc,
      expDate: expDate,
      qtyDeducted: deductQty,
      previousQty: currentQty,
      newQty: newQty,
      message: `Deducted ${deductQty.toLocaleString()} units of ${desc}. Remaining: ${newQty.toLocaleString()}`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Updates an existing row (useful for restocking 0-qty lines with new expiry and qty, or editing details)
 */
function updateMedicineBatch(payload) {
  try {
    const { rowIndex, itemCode, itemDesc, newQty, newExpDate } = payload;
    const info = getInventorySheetInfo();
    const sheet = info.sheet;

    const targetCode = String(sheet.getRange(rowIndex, info.colCode + 1).getValue()).trim();
    if (targetCode.toUpperCase() !== String(itemCode).trim().toUpperCase()) {
      throw new Error(`Row mismatch! Row ${rowIndex} does not match ${itemCode}.`);
    }

    const cleanQty = parseFloat(String(newQty).replace(/[^0-9.-]/g, '')) || 0;
    const cleanExp = String(newExpDate || '').trim();

    const ssTz = sheet.getParent().getSpreadsheetTimeZone();
    const formattedExp = normalizeExpiryString(cleanExp, ssTz);

    if (itemDesc) {
      sheet.getRange(rowIndex, info.colDesc + 1)
        .setValue(String(itemDesc).trim())
        .setHorizontalAlignment('left');
    }

    // Set Quantity (Right-aligned, number format #,##0)
    sheet.getRange(rowIndex, info.colQty + 1)
      .setValue(cleanQty)
      .setNumberFormat('#,##0')
      .setHorizontalAlignment('right');
    
    // Set Expiry Date (Plain text '@' centered)
    sheet.getRange(rowIndex, info.colExp + 1)
      .setNumberFormat('@')
      .setValue(formattedExp)
      .setHorizontalAlignment('center');

    return {
      success: true,
      message: `Updated [${itemCode}] at row ${rowIndex}: Qty set to ${cleanQty.toLocaleString()}, Expiry set to ${formattedExp}`
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Initializes and formats the STOCK_OUT_LOG sheet
 */
function initLogSheet(ss) {
  const logSheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
  const headers = [
    'TIMESTAMP',
    'ITEM CODE',
    'ITEM DESCRIPTION',
    'EXPIRY DATE',
    'QTY OUT',
    'PREVIOUS QTY',
    'REMAINING BALANCE',
    'REMARKS',
    'DISPENSED BY'
  ];
  
  logSheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#ffffff');

  logSheet.setFrozenRows(1);
  logSheet.setColumnWidth(1, 160); // Timestamp
  logSheet.setColumnWidth(2, 130); // Code
  logSheet.setColumnWidth(3, 280); // Desc
  logSheet.setColumnWidth(4, 110); // Expiry
  logSheet.setColumnWidth(5, 100); // Qty Out
  logSheet.setColumnWidth(6, 110); // Prev
  logSheet.setColumnWidth(7, 130); // Rem
  logSheet.setColumnWidth(8, 180); // Remarks
  logSheet.setColumnWidth(9, 150); // User

  return logSheet;
}

/**
 * Appends transaction record to STOCK_OUT_LOG
 */
function logStockOutTransaction(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = initLogSheet(ss);
    }

    const row = [
      Utilities.formatDate(data.timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
      data.itemCode,
      data.itemDesc,
      data.expDate,
      data.qtyOut,
      data.previousQty,
      data.remainingBalance,
      data.remarks,
      data.user
    ];

    logSheet.appendRow(row);
    const lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow, 5, 1, 3).setNumberFormat('#,##0');
  } catch (err) {
    Logger.log("Error logging stock-out: " + err.message);
  }
}

/**
 * Fetches recent audit logs from STOCK_OUT_LOG
 */
function getRecentLogs(limit) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
    if (!logSheet || logSheet.getLastRow() <= 1) {
      return { success: true, logs: [] };
    }

    const max = limit || 50;
    const values = logSheet.getDataRange().getValues();
    const logs = [];

    // Read in reverse chronological order
    for (let i = values.length - 1; i >= 1 && logs.length < max; i--) {
      const r = values[i];
      logs.push({
        timestamp: r[0],
        itemCode: r[1],
        itemDesc: r[2],
        expDate: r[3],
        qtyOut: r[4],
        previousQty: r[5],
        remainingBalance: r[6],
        remarks: r[7],
        user: r[8]
      });
    }

    return { success: true, logs: logs };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
