/**
 * ============================================================================
 * AMANG RODRIGUEZ MEMORIAL MEDICAL CENTER
 * Pharmacy Stock Loan Management System (Code.gs)
 * Supports full Partial Payment & Settlement tracking for UTANG & PAUTANG
 * ============================================================================
 */

const CONFIG = {
  SPREADSHEET_ID: '1LlL_Zj-5ndXALLm1Xl-jG2RyNHllAlUDC9WSRnZpnek',
  UTANG_SHEET_NAME: 'UTANG',
  PAUTANG_SHEET_NAME: 'PAUTANG',
  MEDICINE_MASTER_SHEET_NAME: 'Medicine_master',
  HEADER_ROW: 1, // Row where headers reside
  DATA_START_ROW: 2,
  COLUMNS: {
    DATE: 1,            // Col A: Date
    FACILITY: 2,        // Col B: Facility / Lender / Borrower
    DOC_NO: 3,          // Col C: Doc No
    ITEM_ID: 4,         // Col D: Item Code / DMR ID
    ITEM_DESC: 5,       // Col E: Item Description
    QTY: 6,             // Col F: Original QTY
    STATUS: 7,          // Col G: Status (UNPAID / PAID / PARTIAL / DONATION)
    DATE_PAYMENT: 8,    // Col H: Date of Payment / Settlement
    REMARKS: 9,         // Col I: Remarks / Installment notes
    PARTIAL_QTY: 10,    // Col J (Optional): Cumulative Paid / Returned Qty
    REMAINING_BAL: 11   // Col K (Optional): Remaining Balance
  }
};

/**
 * Creates custom menu when opening the Google Spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('💊 Stock Loan Management')
    .addItem('🚀 Open Stock Loan Manager (Dialog)', 'openAppDialog')
    .addItem('📱 Open Stock Loan Manager (Sidebar)', 'openAppSidebar')
    .addSeparator()
    .addItem('🔄 Fix & Align All Tabs (UTANG, PAUTANG, Facilities)', 'syncMissingStatuses')
    .addItem('🗑️ Remove Document No. Column from Sheets', 'removeDocumentNoColumn')
    .addItem('🧹 Clean Medicine_master (Keep only DMR & DMDON)', 'cleanMedicineMaster')
    .addSeparator()
    .addItem('📋 Go to Borrowed Loans (UTANG)', 'openUtangSheet')
    .addItem('📋 Go to Lent Loans (PAUTANG)', 'openPautangSheet')
    .addToUi();
}

/**
 * Web App entry point for standalone URL
 */
function doGet(e) {
  const templateName = getHtmlTemplateName();
  return HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setTitle('Pharmacy Stock Loan Management - ARMMC')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getHtmlTemplateName() {
  try {
    HtmlService.createTemplateFromFile('Index');
    return 'Index';
  } catch (err) {
    return 'StockLoan_Index';
  }
}

function openAppDialog() {
  const templateName = getHtmlTemplateName();
  const html = HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setWidth(1280)
    .setHeight(820);
  SpreadsheetApp.getUi().showModalDialog(html, '💊 Stock Loan Management — ARMMC Pharmacy');
}

function openAppSidebar() {
  const templateName = getHtmlTemplateName();
  const html = HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setTitle('Stock Loan Manager');
  SpreadsheetApp.getUi().showSidebar(html);
}

function openUtangSheet() {
  const ss = getSpreadsheet();
  if (!ss) return;
  const sheet = ss.getSheetByName(CONFIG.UTANG_SHEET_NAME);
  if (sheet) ss.setActiveSheet(sheet);
}

function openPautangSheet() {
  const ss = getSpreadsheet();
  if (!ss) return;
  const sheet = ss.getSheetByName(CONFIG.PAUTANG_SHEET_NAME);
  if (sheet) ss.setActiveSheet(sheet);
}

/**
 * Robust Spreadsheet getter: supports container-bound and standalone Web App execution
 */
function getSpreadsheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  
  if (CONFIG.SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    } catch (e) {
      Logger.log('Failed to open spreadsheet by ID: ' + e);
    }
  }
  return null;
}

/**
 * Helper to get target sheet safely
 */
function getTargetSheet(tabType) {
  const ss = getSpreadsheet();
  if (!ss) return null;
  
  const targetName = tabType === 'PAUTANG' ? CONFIG.PAUTANG_SHEET_NAME : CONFIG.UTANG_SHEET_NAME;
  let sheet = ss.getSheetByName(targetName);
  
  if (!sheet) {
    // Case-insensitive search fallback
    const sheets = ss.getSheets();
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getName().trim().toUpperCase() === targetName.toUpperCase()) {
        sheet = sheets[i];
        break;
      }
    }
  }
  return sheet;
}

/**
 * Detect column indexes based on header row
 */
function detectColumns(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 12);
  const headers = sheet.getRange(CONFIG.HEADER_ROW || 1, 1, 1, lastCol).getValues()[0];
  
  const colMap = {
    date: -1,
    facility: -1,
    docNo: -1,
    itemId: -1,
    itemDesc: -1,
    qty: -1,
    status: -1,
    datePayment: -1,
    remarks: -1,
    partialQty: -1,
    remainingBal: -1
  };

  headers.forEach((h, idx) => {
    const title = String(h || '').trim().toUpperCase();
    if (!title) return;
    const colIdx = idx + 1;

    // Strict priority matches
    if (title === 'STATUS' || title.includes('STATUS')) {
      colMap.status = colIdx;
    } else if (title.includes('PARTIAL') || title.includes('RETURNED') || title.includes('PAID QTY')) {
      colMap.partialQty = colIdx;
    } else if (title.includes('BALANCE') || title.includes('REMAINING')) {
      colMap.remainingBal = colIdx;
    } else if (title.includes('PAYMENT') || title.includes('DATE OF PAYMENT') || title.includes('SETTLED DATE')) {
      colMap.datePayment = colIdx;
    } else if (title.includes('DATE')) {
      colMap.date = colIdx;
    } else if (title.includes('LENDER') || title.includes('BORROWER') || title.includes('FACILITY') || title.includes('HOSPITAL')) {
      colMap.facility = colIdx;
    } else if (title.includes('DOC') || title.includes('RIS') || title.includes('NO.') || title.includes('REF')) {
      colMap.docNo = colIdx;
    } else if (title.includes('ITEM CODE') || title.includes('ITEM ID') || title.includes('DMR') || title.includes('CODE')) {
      colMap.itemId = colIdx;
    } else if (title.includes('DESC') || title.includes('ITEM') || title.includes('MEDICINE') || title.includes('PARTICULAR')) {
      colMap.itemDesc = colIdx;
    } else if (title === 'QTY' || title.includes('QUANTITY')) {
      colMap.qty = colIdx;
    } else if (title.includes('REMARK') || title.includes('NOTE')) {
      colMap.remarks = colIdx;
    }
  });

  // Check if sheet has PARTIAL RETURN and REMAINING BALANCE before STATUS
  const isPartialBeforeStatus = (colMap.partialQty > 0 && colMap.status > 0 && colMap.partialQty < colMap.status);
  const hasDocNo = colMap.docNo > 0;

  // Fallbacks if headers weren't named identically
  if (colMap.date === -1) colMap.date = 1;
  if (colMap.facility === -1) colMap.facility = 2;
  if (colMap.itemId === -1) colMap.itemId = hasDocNo ? 4 : 3;
  if (colMap.itemDesc === -1) colMap.itemDesc = hasDocNo ? 5 : 4;
  if (colMap.qty === -1) colMap.qty = hasDocNo ? 6 : 5;

  if (colMap.status === -1) {
    colMap.status = isPartialBeforeStatus ? (hasDocNo ? 9 : 8) : (hasDocNo ? 7 : 6);
  }
  if (colMap.datePayment === -1) {
    colMap.datePayment = isPartialBeforeStatus ? (hasDocNo ? 10 : 9) : (hasDocNo ? 8 : 7);
  }
  if (colMap.remarks === -1) {
    colMap.remarks = isPartialBeforeStatus ? (hasDocNo ? 11 : 10) : (hasDocNo ? 9 : 8);
  }
  if (colMap.partialQty === -1 && !isPartialBeforeStatus && headers.length >= 10 && headers[9]) {
    colMap.partialQty = hasDocNo ? 10 : 9;
  }
  if (colMap.remainingBal === -1 && !isPartialBeforeStatus && headers.length >= 11 && headers[10]) {
    colMap.remainingBal = hasDocNo ? 11 : 10;
  }

  return colMap;
}

/**
 * Format dates safely into YYYY-MM-DD string
 */
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(val).trim();
}

/**
 * Parses remarks to extract partial settlement info if dedicated columns are absent
 */
function parsePartialFromRemarks(remarks, originalQty) {
  if (!remarks) return { partialQty: '', remainingBalance: '' };
  
  const remStr = String(remarks);
  const balMatch = remStr.match(/(?:bal|balance|remaining|rem)\s*(?::|=)?\s*(\d+(?:\.\d+)?)/i);
  let remainingBalance = balMatch ? Number(balMatch[1]) : '';

  const numMatches = remStr.matchAll(/(\d+(?:\.\d+)?)\s*(?:pcs|units|vials|amps|tabs|caps|boxes|bottles|bags)?\s*(?:\([^)]*\))?/gi);
  let totalPartial = 0;
  let count = 0;

  for (const m of numMatches) {
    const val = Number(m[1]);
    if (val >= 1990 && val <= 2050) continue; // Skip year numbers
    if (val === originalQty && count === 0) continue; // Skip original qty echo
    totalPartial += val;
    count++;
  }

  let partialQty = totalPartial > 0 ? totalPartial : '';
  if (partialQty !== '' && remainingBalance === '' && originalQty > 0) {
    remainingBalance = Math.max(0, originalQty - partialQty);
  }

  return { partialQty, remainingBalance };
}

/**
 * Fetches all loan records for the specified tab (UTANG or PAUTANG)
 */
function getLoanData(tabType) {
  try {
    const sheet = getTargetSheet(tabType);
    if (!sheet) {
      return { success: false, message: `Sheet '${tabType}' not found in spreadsheet`, records: [] };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < CONFIG.DATA_START_ROW) {
      return { success: true, records: [], tabType: tabType };
    }

    const cols = detectColumns(sheet);
    const maxCol = Math.max(sheet.getLastColumn(), 11);
    const dataRange = sheet.getRange(CONFIG.DATA_START_ROW, 1, lastRow - CONFIG.DATA_START_ROW + 1, maxCol);
    const values = dataRange.getValues();

    const records = [];

    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const actualRowIndex = CONFIG.DATA_START_ROW + i;

      const dateRaw = cols.date > 0 ? row[cols.date - 1] : '';
      const facilityRaw = cols.facility > 0 ? row[cols.facility - 1] : '';
      const docNoRaw = cols.docNo > 0 ? row[cols.docNo - 1] : '';
      const itemIdRaw = cols.itemId > 0 ? row[cols.itemId - 1] : '';
      const itemDescRaw = cols.itemDesc > 0 ? row[cols.itemDesc - 1] : '';
      const qtyRaw = cols.qty > 0 ? row[cols.qty - 1] : '';
      const statusRaw = cols.status > 0 ? row[cols.status - 1] : '';
      const datePaymentRaw = cols.datePayment > 0 ? row[cols.datePayment - 1] : '';
      const remarksRaw = cols.remarks > 0 ? row[cols.remarks - 1] : '';
      
      let partialQtyRaw = cols.partialQty > 0 ? row[cols.partialQty - 1] : '';
      let remainingBalRaw = cols.remainingBal > 0 ? row[cols.remainingBal - 1] : '';

      // Skip completely blank rows
      if (!facilityRaw && !itemDescRaw && !qtyRaw && !docNoRaw) {
        continue;
      }

      const numQty = parseFloat(qtyRaw) || 0;
      const statusClean = String(statusRaw || 'UNPAID').trim();
      const isPartialStatus = statusClean.toUpperCase().includes('PARTIAL');

      // If dedicated columns are empty or don't exist, parse from remarks
      if (isPartialStatus && (!partialQtyRaw || !remainingBalRaw)) {
        const parsed = parsePartialFromRemarks(remarksRaw, numQty);
        if (!partialQtyRaw && parsed.partialQty) partialQtyRaw = parsed.partialQty;
        if (!remainingBalRaw && parsed.remainingBalance !== '') remainingBalRaw = parsed.remainingBalance;
      }

      records.push({
        rowIndex: actualRowIndex,
        date: formatDateValue(dateRaw),
        facility: String(facilityRaw || '').trim(),
        docNo: String(docNoRaw || '').trim(),
        itemId: String(itemIdRaw || '').trim(),
        itemDesc: String(itemDescRaw || '').trim(),
        qty: numQty,
        status: statusClean,
        datePayment: formatDateValue(datePaymentRaw),
        remarks: String(remarksRaw || '').trim(),
        partialReturn: partialQtyRaw !== '' ? (parseFloat(partialQtyRaw) || 0) : '',
        remainingBalance: remainingBalRaw !== '' ? (parseFloat(remainingBalRaw) || 0) : (isPartialStatus && partialQtyRaw ? Math.max(0, numQty - (parseFloat(partialQtyRaw) || 0)) : '')
      });
    }

    return {
      success: true,
      tabType: tabType,
      records: records,
      totalCount: records.length
    };
  } catch (err) {
    return { success: false, message: err.toString(), records: [] };
  }
}

/**
 * Retrieves all distinct facility names across both UTANG and PAUTANG sheets
 */
function getAllFacilities() {
  try {
    const ss = getSpreadsheet();
    if (!ss) return { success: true, all: [] };
    
    const facilitiesSet = new Set();

    [CONFIG.UTANG_SHEET_NAME, CONFIG.PAUTANG_SHEET_NAME].forEach(tabName => {
      const sheet = ss.getSheetByName(tabName);
      if (!sheet) return;
      const lastRow = sheet.getLastRow();
      if (lastRow < CONFIG.DATA_START_ROW) return;

      const cols = detectColumns(sheet);
      if (cols.facility > 0) {
        const values = sheet.getRange(CONFIG.DATA_START_ROW, cols.facility, lastRow - CONFIG.DATA_START_ROW + 1, 1).getValues();
        values.forEach(r => {
          const val = String(r[0] || '').trim();
          if (val) facilitiesSet.add(val);
        });
      }
    });

    return {
      success: true,
      all: Array.from(facilitiesSet).sort()
    };
  } catch (err) {
    return { success: false, all: [] };
  }
}

/**
 * Retrieves all items (DCI Code & Item Description) from Medicine_master sheet
 */
function getMedicineMasterList() {
  try {
    const ss = getSpreadsheet();
    if (!ss) return { success: true, items: [] };
    
    const sheet = ss.getSheetByName(CONFIG.MEDICINE_MASTER_SHEET_NAME || 'Medicine_master');
    if (!sheet) return { success: true, items: [] };

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, items: [] };

    // Fetch column A (DCI Code) and column B (Item Description)
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const items = [];
    const seen = new Set();

    for (let i = 0; i < values.length; i++) {
      const code = String(values[i][0] || '').trim().toUpperCase();
      const desc = String(values[i][1] || '').trim().toUpperCase();
      if (!desc && !code) continue;

      const key = `${code}|${desc}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ code: code, desc: desc });
      }
    }

    return {
      success: true,
      items: items,
      totalCount: items.length
    };
  } catch (err) {
    Logger.log('Error fetching Medicine_master list: ' + err);
    return { success: false, items: [], message: err.toString() };
  }
}

/**
 * Normalizes status strings to match exact Google Sheets dropdown values
 */
function normalizeStatus(status) {
  const s = String(status || '').trim().toUpperCase();
  if (s.includes('PARTIAL')) return 'PARTIAL PAYMENT';
  if (s.startsWith('PAID') || s === 'PAID') return 'PAID';
  if (s.includes('NOT CLEARED') || s.includes('UNCLEARED')) return 'NOT CLEARED';
  if (s.includes('DONATION')) return 'DONATION';
  return 'UNPAID';
}

/**
 * Updates a loan record in Google Sheets
 */
function updateLoanRecord(tabType, rowIndex, data) {
  try {
    const sheet = getTargetSheet(tabType);
    if (!sheet) {
      return { success: false, message: `Sheet '${tabType}' not found` };
    }

    if (rowIndex < CONFIG.DATA_START_ROW || rowIndex > sheet.getLastRow()) {
      return { success: false, message: `Invalid row index ${rowIndex}` };
    }

    const cols = detectColumns(sheet);

    if (cols.facility > 0 && data.facility !== undefined) {
      sheet.getRange(rowIndex, cols.facility).setValue(String(data.facility).toUpperCase());
    }
    if (cols.docNo > 0 && data.docNo !== undefined) {
      sheet.getRange(rowIndex, cols.docNo).setValue(String(data.docNo).toUpperCase());
    }
    if (cols.date > 0 && data.date !== undefined) {
      sheet.getRange(rowIndex, cols.date).setValue(data.date);
    }
    if (cols.itemId > 0 && data.itemId !== undefined) {
      sheet.getRange(rowIndex, cols.itemId).setValue(String(data.itemId).toUpperCase());
    }
    if (cols.itemDesc > 0 && data.itemDesc !== undefined) {
      sheet.getRange(rowIndex, cols.itemDesc).setValue(String(data.itemDesc).toUpperCase());
    }
    if (cols.qty > 0 && data.qty !== undefined) {
      sheet.getRange(rowIndex, cols.qty).setValue(parseFloat(data.qty) || 0);
    }
    if (cols.status > 0 && data.status !== undefined) {
      const statusVal = normalizeStatus(data.status);
      const statusCell = sheet.getRange(rowIndex, cols.status);
      statusCell.setValue(statusVal);

      // Copy data validation (dropdown pill) from previous row if missing
      if (rowIndex > CONFIG.DATA_START_ROW && !statusCell.getDataValidation()) {
        try {
          const prevStatusCell = sheet.getRange(rowIndex - 1, cols.status);
          if (prevStatusCell.getDataValidation()) {
            prevStatusCell.copyTo(statusCell, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
          }
        } catch (vErr) {
          Logger.log('Could not copy validation in update: ' + vErr);
        }
      }
    }
    if (cols.datePayment > 0 && data.datePayment !== undefined) {
      sheet.getRange(rowIndex, cols.datePayment).setValue(data.datePayment);
    }
    if (cols.remarks > 0 && data.remarks !== undefined) {
      const remCell = sheet.getRange(rowIndex, cols.remarks);
      remCell.setValue(String(data.remarks).toUpperCase());
      try {
        remCell.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      } catch (e) {}
    }

    // Optional columns J & K for partial quantity and balance
    if (cols.partialQty > 0 && data.partialReturn !== undefined) {
      sheet.getRange(rowIndex, cols.partialQty).setValue(data.partialReturn === '' ? '' : (parseFloat(data.partialReturn) || 0));
    }
    if (cols.remainingBal > 0 && data.remainingBalance !== undefined) {
      sheet.getRange(rowIndex, cols.remainingBal).setValue(data.remainingBalance === '' ? '' : (parseFloat(data.remainingBalance) || 0));
    }

    // Enforce Roboto font, font size 10, and vertical alignment on the updated row
    try {
      sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn())
           .setFontFamily('Roboto')
           .setFontSize(10)
           .setVerticalAlignment('middle');
    } catch (fErr) {
      Logger.log('Could not set Roboto font on update: ' + fErr);
    }

    // Set proper horizontal alignments on updated fields
    try {
      if (cols.date > 0 && data.date !== undefined) sheet.getRange(rowIndex, cols.date).setHorizontalAlignment('center');
      if (cols.facility > 0 && data.facility !== undefined) sheet.getRange(rowIndex, cols.facility).setHorizontalAlignment('left');
      if (cols.itemId > 0 && data.itemId !== undefined) sheet.getRange(rowIndex, cols.itemId).setHorizontalAlignment('center');
      if (cols.itemDesc > 0 && data.itemDesc !== undefined) sheet.getRange(rowIndex, cols.itemDesc).setHorizontalAlignment('left');
      if (cols.qty > 0 && data.qty !== undefined) sheet.getRange(rowIndex, cols.qty).setHorizontalAlignment('center');
      if (cols.partialQty > 0 && data.partialReturn !== undefined) sheet.getRange(rowIndex, cols.partialQty).setHorizontalAlignment('center');
      if (cols.remainingBal > 0 && data.remainingBalance !== undefined) sheet.getRange(rowIndex, cols.remainingBal).setHorizontalAlignment('center');
      if (cols.status > 0 && data.status !== undefined) sheet.getRange(rowIndex, cols.status).setHorizontalAlignment('center');
      if (cols.datePayment > 0 && data.datePayment !== undefined) sheet.getRange(rowIndex, cols.datePayment).setHorizontalAlignment('center');
      if (cols.remarks > 0 && data.remarks !== undefined) sheet.getRange(rowIndex, cols.remarks).setHorizontalAlignment('left');
    } catch (alignErr) {
      Logger.log('Could not set column alignment on update: ' + alignErr);
    }

    return { success: true, message: 'Record updated successfully' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Appends a new loan record to Google Sheets
 */
function addNewLoanRecord(tabType, data) {
  try {
    const sheet = getTargetSheet(tabType);
    if (!sheet) {
      return { success: false, message: `Sheet '${tabType}' not found` };
    }

    const cols = detectColumns(sheet);
    const maxCol = Math.max(sheet.getLastColumn(), 12);
    const newRow = new Array(maxCol).fill('');
    const statusVal = normalizeStatus(data.status);

    if (cols.date > 0) newRow[cols.date - 1] = data.date || formatDateValue(new Date());
    if (cols.facility > 0) newRow[cols.facility - 1] = String(data.facility || '').toUpperCase();
    if (cols.docNo > 0) newRow[cols.docNo - 1] = String(data.docNo || '').toUpperCase();
    if (cols.itemId > 0) newRow[cols.itemId - 1] = String(data.itemId || '').toUpperCase();
    if (cols.itemDesc > 0) newRow[cols.itemDesc - 1] = String(data.itemDesc || '').toUpperCase();
    if (cols.qty > 0) newRow[cols.qty - 1] = parseFloat(data.qty) || 0;
    if (cols.status > 0) newRow[cols.status - 1] = statusVal;
    if (cols.datePayment > 0) newRow[cols.datePayment - 1] = data.datePayment || '';
    if (cols.remarks > 0) newRow[cols.remarks - 1] = String(data.remarks || '').toUpperCase();
    if (cols.partialQty > 0 && data.partialReturn) newRow[cols.partialQty - 1] = parseFloat(data.partialReturn) || 0;
    if (cols.remainingBal > 0 && data.remainingBalance) newRow[cols.remainingBal - 1] = parseFloat(data.remainingBalance) || 0;

    sheet.appendRow(newRow);
    const insertedRowIndex = sheet.getLastRow();

    // Explicitly guarantee status is written to the correct cell
    if (cols.status > 0) {
      sheet.getRange(insertedRowIndex, cols.status).setValue(statusVal);
    }

    // Clip remarks so text does not spill horizontally across empty columns
    if (cols.remarks > 0) {
      try {
        sheet.getRange(insertedRowIndex, cols.remarks).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
      } catch (e) {}
    }

    // Format new row: Roboto font, size 10, vertical middle, and cell borders to blend with table
    const newRowRange = sheet.getRange(insertedRowIndex, 1, 1, maxCol);
    try {
      newRowRange.setFontFamily('Roboto')
                 .setFontSize(10)
                 .setVerticalAlignment('middle')
                 .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
    } catch (fontErr) {
      Logger.log('Could not format new row styling/borders: ' + fontErr);
    }

    // Set explicit horizontal alignment per column
    try {
      if (cols.date > 0) sheet.getRange(insertedRowIndex, cols.date).setHorizontalAlignment('center');
      if (cols.facility > 0) sheet.getRange(insertedRowIndex, cols.facility).setHorizontalAlignment('left');
      if (cols.docNo > 0) sheet.getRange(insertedRowIndex, cols.docNo).setHorizontalAlignment('center');
      if (cols.itemId > 0) sheet.getRange(insertedRowIndex, cols.itemId).setHorizontalAlignment('center');
      if (cols.itemDesc > 0) sheet.getRange(insertedRowIndex, cols.itemDesc).setHorizontalAlignment('left');
      if (cols.qty > 0) sheet.getRange(insertedRowIndex, cols.qty).setHorizontalAlignment('center');
      if (cols.partialQty > 0) sheet.getRange(insertedRowIndex, cols.partialQty).setHorizontalAlignment('center');
      if (cols.remainingBal > 0) sheet.getRange(insertedRowIndex, cols.remainingBal).setHorizontalAlignment('center');
      if (cols.status > 0) sheet.getRange(insertedRowIndex, cols.status).setHorizontalAlignment('center');
      if (cols.datePayment > 0) sheet.getRange(insertedRowIndex, cols.datePayment).setHorizontalAlignment('center');
      if (cols.remarks > 0) sheet.getRange(insertedRowIndex, cols.remarks).setHorizontalAlignment('left');
    } catch (alignErr) {
      Logger.log('Could not set column alignment in addNewLoanRecord: ' + alignErr);
    }

    // Set row height to match table row height (26px or previous row height)
    try {
      if (insertedRowIndex > CONFIG.DATA_START_ROW) {
        const prevHeight = sheet.getRowHeight(insertedRowIndex - 1);
        if (prevHeight && prevHeight >= 20) {
          sheet.setRowHeight(insertedRowIndex, prevHeight);
        } else {
          sheet.setRowHeight(insertedRowIndex, 26);
        }
      } else {
        sheet.setRowHeight(insertedRowIndex, 26);
      }
    } catch (hErr) {
      Logger.log('Could not set row height: ' + hErr);
    }

    // Automatically copy dropdown data validation & styling from preceding row
    if (insertedRowIndex > CONFIG.DATA_START_ROW) {
      try {
        const prevRowRange = sheet.getRange(insertedRowIndex - 1, 1, 1, maxCol);
        prevRowRange.copyTo(newRowRange, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
      } catch (copyErr) {
        Logger.log('Could not copy data validation to new row: ' + copyErr);
      }
    }

    return {
      success: true,
      message: 'New loan encoded successfully',
      rowIndex: insertedRowIndex
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Utility to sync/fix all rows in UTANG & PAUTANG that have blank status, wrong format, or spilling remarks
 */
function syncMissingStatuses() {
  try {
    const ss = getSpreadsheet();
    if (!ss) {
      SpreadsheetApp.getUi().alert('❌ Could not open spreadsheet.');
      return;
    }

    let totalFixed = 0;
    const report = [];

    // Dynamically identify all loan sheets across the entire workbook
    const allSheets = ss.getSheets();
    const loanSheets = [];

    allSheets.forEach(sheet => {
      const name = sheet.getName().trim();
      const lower = name.toLowerCase();
      // Skip master medicine and backup sheets
      if (lower.includes('medicine') || lower.includes('master') || lower.includes('backup')) {
        return;
      }
      if (sheet.getLastRow() < CONFIG.DATA_START_ROW) return;
      const cols = detectColumns(sheet);
      // Sheet qualifies if it has loan-related columns
      if (cols.qty > 0 || cols.status > 0 || cols.itemDesc > 0 || cols.facility > 0) {
        loanSheets.push(sheet);
      }
    });

    if (loanSheets.length === 0) {
      SpreadsheetApp.getUi().alert('ℹ️ No loan sheets found to sync.');
      return;
    }

    loanSheets.forEach(sheet => {
      const tabName = sheet.getName();
      const lastRow = sheet.getLastRow();
      if (lastRow < CONFIG.DATA_START_ROW) return;

      const numRows = lastRow - CONFIG.DATA_START_ROW + 1;
      const lastCol = sheet.getLastColumn();
      const cols = detectColumns(sheet);

      // 1. Set full data range font (Roboto, 10), vertical centering, and solid light gray borders
      try {
        const fullDataRange = sheet.getRange(CONFIG.DATA_START_ROW, 1, numRows, lastCol);
        fullDataRange.setFontFamily('Roboto')
                     .setFontSize(10)
                     .setVerticalAlignment('middle')
                     .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
      } catch (fontErr) {
        Logger.log('Font and border set error in sync: ' + fontErr);
      }

      // 2. Set horizontal alignment per column across all data rows
      try {
        if (cols.date > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.date, numRows, 1).setHorizontalAlignment('center');
        if (cols.facility > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.facility, numRows, 1).setHorizontalAlignment('left');
        if (cols.docNo > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.docNo, numRows, 1).setHorizontalAlignment('center');
        if (cols.itemId > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.itemId, numRows, 1).setHorizontalAlignment('center');
        if (cols.itemDesc > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.itemDesc, numRows, 1).setHorizontalAlignment('left');
        if (cols.qty > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.qty, numRows, 1).setHorizontalAlignment('center');
        if (cols.partialQty > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.partialQty, numRows, 1).setHorizontalAlignment('center');
        if (cols.remainingBal > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.remainingBal, numRows, 1).setHorizontalAlignment('center');
        if (cols.status > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.status, numRows, 1).setHorizontalAlignment('center');
        if (cols.datePayment > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.datePayment, numRows, 1).setHorizontalAlignment('center');
        if (cols.remarks > 0) sheet.getRange(CONFIG.DATA_START_ROW, cols.remarks, numRows, 1).setHorizontalAlignment('left');
      } catch (alignErr) {
        Logger.log('Column alignment error in sheet ' + tabName + ': ' + alignErr);
      }

      // 3. Ensure uniform row height (26px) across data rows
      for (let r = CONFIG.DATA_START_ROW; r <= lastRow; r++) {
        try {
          const curH = sheet.getRowHeight(r);
          if (!curH || curH < 24) {
            sheet.setRowHeight(r, 26);
          }
        } catch (hErr) {}
      }

      // 4. Fix Remarks column: header label, width, and clip overflow so it does not spill horizontally
      if (cols.remarks > 0) {
        try {
          const headerCell = sheet.getRange(CONFIG.HEADER_ROW || 1, cols.remarks);
          const curHeader = String(headerCell.getValue() || '').trim().toUpperCase();
          if (!curHeader || curHeader.startsWith('CO')) {
            headerCell.setValue('REMARKS');
          }
          sheet.setColumnWidth(cols.remarks, 260);
          sheet.getRange(CONFIG.DATA_START_ROW, cols.remarks, numRows, 1)
               .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
        } catch (remErr) {
          Logger.log('Remarks format error: ' + remErr);
        }
      }

      // 5. Check statuses and apply data validation if available
      let templateCell = null;
      if (cols.status > 0) {
        for (let r = CONFIG.DATA_START_ROW; r <= lastRow; r++) {
          const cell = sheet.getRange(r, cols.status);
          if (cell.getDataValidation()) {
            templateCell = cell;
            break;
          }
        }
      }

      let tabFixed = 0;
      const values = sheet.getRange(CONFIG.DATA_START_ROW, 1, numRows, lastCol).getValues();

      for (let i = 0; i < values.length; i++) {
        const rowData = values[i];
        const rowIdx = CONFIG.DATA_START_ROW + i;

        // Check if row has content
        const facility = cols.facility > 0 ? rowData[cols.facility - 1] : '';
        const item = cols.itemDesc > 0 ? rowData[cols.itemDesc - 1] : '';
        const qty = cols.qty > 0 ? rowData[cols.qty - 1] : '';
        const doc = cols.docNo > 0 ? rowData[cols.docNo - 1] : '';

        if (!facility && !item && !qty && !doc) continue; // skip blank row

        if (cols.status > 0) {
          const currentStatus = String(rowData[cols.status - 1] || '').trim();
          const statusCell = sheet.getRange(rowIdx, cols.status);
          let modified = false;

          // Fix "PARTIAL" -> "PARTIAL PAYMENT" so it matches the dropdown item exactly
          if (currentStatus.toUpperCase() === 'PARTIAL') {
            statusCell.setValue('PARTIAL PAYMENT');
            modified = true;
          } else if (!currentStatus) {
            statusCell.setValue('UNPAID');
            modified = true;
          }

          // Apply dropdown validation if missing
          if (templateCell && !statusCell.getDataValidation()) {
            templateCell.copyTo(statusCell, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
            modified = true;
          }

          if (modified) tabFixed++;
        }
      }

      totalFixed += tabFixed;
      report.push(`• ${tabName}: formatted ${numRows} row(s)` + (tabFixed > 0 ? ` (${tabFixed} status values corrected)` : ''));
    });

    // Also format Medicine_master if present
    try {
      const medSheet = ss.getSheetByName(CONFIG.MEDICINE_MASTER_SHEET_NAME || 'Medicine_master');
      if (medSheet && medSheet.getLastRow() >= 2) {
        const mRows = medSheet.getLastRow() - 1;
        const mCols = medSheet.getLastColumn();
        medSheet.getRange(2, 1, mRows, mCols).setFontFamily('Roboto').setFontSize(10).setVerticalAlignment('middle');
        // Col A (DCI Code): Center
        medSheet.getRange(2, 1, mRows, 1).setHorizontalAlignment('center');
        // Col B (Item Description): Left
        if (mCols >= 2) {
          medSheet.getRange(2, 2, mRows, 1).setHorizontalAlignment('left');
        }
      }
    } catch (medErr) {
      Logger.log('Medicine_master format error: ' + medErr);
    }

    SpreadsheetApp.getUi().alert(
      `✅ Alignment & Multi-Tab Sync Complete!\n\n` +
      `Processed ${loanSheets.length} sheet(s):\n` +
      report.join('\n') + `\n\n` +
      `• Centered: Date Released/Borrowed, Item ID, QTY, Partial Return, Remaining Balance, Status, Date of Payment.\n` +
      `• Left-aligned: Borrower/Lender/Facility, Item Description, Remarks.\n` +
      `• Formatted: 'Roboto' font (size 10), middle vertical alignment, uniform 26px row heights, and light gray borders.\n` +
      `• Dropdown chips and clipped remarks applied across all records.`
    );
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Error running repair: ' + err.toString());
  }
}

/**
 * Utility to safely remove the "Document No." / "RIS NO." column from both UTANG and PAUTANG sheets.
 */
function removeDocumentNoColumn() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Confirm Column Deletion',
    'Are you sure you want to delete the "Document No." column from both UTANG and PAUTANG sheets?\n\n' +
    'This will remove Column C (or whichever column holds Document / RIS No.) and shift succeeding columns left.\n\n' +
    'The web app has already been updated to work without this column.',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  const ss = getSpreadsheet();
  if (!ss) {
    ui.alert('❌ Could not access spreadsheet.');
    return;
  }

  const results = [];
  [CONFIG.UTANG_SHEET_NAME, CONFIG.PAUTANG_SHEET_NAME].forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) return;

    const cols = detectColumns(sheet);
    if (cols.docNo > 0) {
      sheet.deleteColumn(cols.docNo);
      results.push(`• ${tabName}: Successfully removed Document No. column (Column ${cols.docNo})`);
    } else {
      results.push(`• ${tabName}: Document No. column is already absent`);
    }
  });

  ui.alert('✅ Document No. Removal Complete\n\n' + results.join('\n'));
}

/**
 * Utility to isolate DMR and DMDON rows in Medicine_master and remove the rest.
 * Automatically creates a backup sheet 'Medicine_master_backup' first.
 */
function cleanMedicineMaster() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Confirm Clean Medicine_master',
    'Are you sure you want to clean "Medicine_master" to keep ONLY codes starting with "DMR" and "DMDON"?\n\n' +
    '• A backup sheet named "Medicine_master_backup" will be created first.\n' +
    '• All other codes (DMC, DMEP, etc.) will be removed from Medicine_master.\n' +
    '• Roboto font will be applied to all remaining records.',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  const ss = getSpreadsheet();
  if (!ss) {
    ui.alert('❌ Could not access spreadsheet.');
    return;
  }

  const sheet = ss.getSheetByName('Medicine_master');
  if (!sheet) {
    ui.alert('❌ Sheet "Medicine_master" not found.');
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) {
    ui.alert('ℹ️ No data rows found in "Medicine_master".');
    return;
  }

  // Create backup if it doesn't already exist
  const backupName = 'Medicine_master_backup';
  if (!ss.getSheetByName(backupName)) {
    sheet.copyTo(ss).setName(backupName);
  }

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const header = data[0];
  const kept = [header];
  let removedCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const code = String(row[0] || '').trim().toUpperCase();
    if (code.startsWith('DMR') || code.startsWith('DMDON')) {
      kept.push(row);
    } else {
      removedCount++;
    }
  }

  // Clear sheet and write back only kept rows
  sheet.clearContents();
  sheet.getRange(1, 1, kept.length, kept[0].length).setValues(kept);

  // Set font to Roboto
  try {
    sheet.getRange(1, 1, kept.length, kept[0].length).setFontFamily('Roboto');
  } catch (e) {}

  ui.alert(
    '✅ Medicine_master Cleaned Successfully!\n\n' +
    `• Kept: ${kept.length - 1} DMR / DMDON items\n` +
    `• Removed: ${removedCount} other items\n` +
    `• Safe backup saved as: "${backupName}"\n` +
    `• Font formatted to: Roboto`
  );
}
