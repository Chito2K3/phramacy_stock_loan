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
  const lastCol = Math.max(sheet.getLastColumn(), 11);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
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
    if (title.includes('DATE') && !title.includes('PAYMENT') && !title.includes('SETTLEMENT')) colMap.date = idx + 1;
    else if (title.includes('LENDER') || title.includes('BORROWER') || title.includes('FACILITY') || title.includes('HOSPITAL')) colMap.facility = idx + 1;
    else if (title.includes('DOC') || title.includes('RIS') || title.includes('NO.') || title.includes('REF')) colMap.docNo = idx + 1;
    else if (title.includes('ITEM CODE') || title.includes('ITEM ID') || title.includes('DMR') || title.includes('CODE')) colMap.itemId = idx + 1;
    else if (title.includes('DESC') || title.includes('ITEM') || title.includes('MEDICINE') || title.includes('PARTICULAR')) colMap.itemDesc = idx + 1;
    else if (title === 'QTY' || title.includes('QUANTITY')) colMap.qty = idx + 1;
    else if (title.includes('STATUS')) colMap.status = idx + 1;
    else if (title.includes('PAYMENT') || title.includes('DATE OF PAYMENT') || title.includes('SETTLED DATE')) colMap.datePayment = idx + 1;
    else if (title.includes('REMARK') || title.includes('NOTE')) colMap.remarks = idx + 1;
    else if (title.includes('PARTIAL') || title.includes('RETURNED') || title.includes('PAID QTY')) colMap.partialQty = idx + 1;
    else if (title.includes('BALANCE') || title.includes('REMAINING')) colMap.remainingBal = idx + 1;
  });

  if (colMap.date === -1) colMap.date = 1;
  if (colMap.facility === -1) colMap.facility = 2;
  if (colMap.docNo === -1) colMap.docNo = 3;
  if (colMap.itemId === -1) colMap.itemId = 4;
  if (colMap.itemDesc === -1) colMap.itemDesc = 5;
  if (colMap.qty === -1) colMap.qty = 6;
  if (colMap.status === -1) colMap.status = 7;
  if (colMap.datePayment === -1) colMap.datePayment = 8;
  if (colMap.remarks === -1) colMap.remarks = 9;
  if (colMap.partialQty === -1 && headers.length >= 10 && headers[9]) colMap.partialQty = 10;
  if (colMap.remainingBal === -1 && headers.length >= 11 && headers[10]) colMap.remainingBal = 11;

  return colMap;
}

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
    if (val >= 1990 && val <= 2050) continue;
    if (val === originalQty && count === 0) continue;
    totalPartial += val;
    count++;
  }

  let partialQty = totalPartial > 0 ? totalPartial : '';
  if (partialQty !== '' && remainingBalance === '' && originalQty > 0) {
    remainingBalance = Math.max(0, originalQty - partialQty);
  }

  return { partialQty, remainingBalance };
}

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

      if (!facilityRaw && !itemDescRaw && !qtyRaw && !docNoRaw) {
        continue;
      }

      const numQty = parseFloat(qtyRaw) || 0;
      const statusClean = String(statusRaw || 'UNPAID').trim();
      const isPartialStatus = statusClean.toUpperCase().includes('PARTIAL');

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
      sheet.getRange(rowIndex, cols.facility).setValue(data.facility);
    }
    if (cols.docNo > 0 && data.docNo !== undefined) {
      sheet.getRange(rowIndex, cols.docNo).setValue(data.docNo);
    }
    if (cols.date > 0 && data.date !== undefined) {
      sheet.getRange(rowIndex, cols.date).setValue(data.date);
    }
    if (cols.itemId > 0 && data.itemId !== undefined) {
      sheet.getRange(rowIndex, cols.itemId).setValue(data.itemId);
    }
    if (cols.itemDesc > 0 && data.itemDesc !== undefined) {
      sheet.getRange(rowIndex, cols.itemDesc).setValue(data.itemDesc);
    }
    if (cols.qty > 0 && data.qty !== undefined) {
      sheet.getRange(rowIndex, cols.qty).setValue(parseFloat(data.qty) || 0);
    }
    if (cols.status > 0 && data.status !== undefined) {
      sheet.getRange(rowIndex, cols.status).setValue(data.status);
    }
    if (cols.datePayment > 0 && data.datePayment !== undefined) {
      sheet.getRange(rowIndex, cols.datePayment).setValue(data.datePayment);
    }
    if (cols.remarks > 0 && data.remarks !== undefined) {
      sheet.getRange(rowIndex, cols.remarks).setValue(data.remarks);
    }

    if (cols.partialQty > 0 && data.partialReturn !== undefined) {
      sheet.getRange(rowIndex, cols.partialQty).setValue(data.partialReturn === '' ? '' : (parseFloat(data.partialReturn) || 0));
    }
    if (cols.remainingBal > 0 && data.remainingBalance !== undefined) {
      sheet.getRange(rowIndex, cols.remainingBal).setValue(data.remainingBalance === '' ? '' : (parseFloat(data.remainingBalance) || 0));
    }

    return { success: true, message: 'Record updated successfully' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function addNewLoanRecord(tabType, data) {
  try {
    const sheet = getTargetSheet(tabType);
    if (!sheet) {
      return { success: false, message: `Sheet '${tabType}' not found` };
    }

    const cols = detectColumns(sheet);
    const maxCol = Math.max(sheet.getLastColumn(), 11);
    const newRow = new Array(maxCol).fill('');

    if (cols.date > 0) newRow[cols.date - 1] = data.date || formatDateValue(new Date());
    if (cols.facility > 0) newRow[cols.facility - 1] = data.facility || '';
    if (cols.docNo > 0) newRow[cols.docNo - 1] = data.docNo || '';
    if (cols.itemId > 0) newRow[cols.itemId - 1] = data.itemId || '';
    if (cols.itemDesc > 0) newRow[cols.itemDesc - 1] = data.itemDesc || '';
    if (cols.qty > 0) newRow[cols.qty - 1] = parseFloat(data.qty) || 0;
    if (cols.status > 0) newRow[cols.status - 1] = data.status || 'UNPAID';
    if (cols.datePayment > 0) newRow[cols.datePayment - 1] = data.datePayment || '';
    if (cols.remarks > 0) newRow[cols.remarks - 1] = data.remarks || '';
    if (cols.partialQty > 0 && data.partialReturn) newRow[cols.partialQty - 1] = parseFloat(data.partialReturn) || 0;
    if (cols.remainingBal > 0 && data.remainingBalance) newRow[cols.remainingBal - 1] = parseFloat(data.remainingBalance) || 0;

    sheet.appendRow(newRow);
    const insertedRowIndex = sheet.getLastRow();

    return {
      success: true,
      message: 'New loan encoded successfully',
      rowIndex: insertedRowIndex
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
