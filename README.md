# 🏥 Amang Rodriguez Memorial Medical Center - Pharmacy Expiry Monitoring System

An automated Google Apps Script (GAS) application and data analysis suite for managing pharmacy storage inventory, FEFO (First-Expired, First-Out) expiration tracking, stock-out dispensing, and automated batch grouping for **Amang Rodriguez Memorial Medical Center (ARMMC)**.

---

## 🌟 Key Features

1. **Smart Batch Grouping & Insertion (`sheet.insertRowAfter`)**:
   - When registering a new batch for an existing medicine (e.g., `DMR000451 FLUCONAZOLE`), the system automatically identifies existing batches and inserts the new batch **directly below the latest batch** of that medicine in Google Sheets.
   - For brand new medicines, appends to the inventory master list.
2. **Stock-Out Dispensing & Real-Time Balance**:
   - 1-click modal to deduct dispensed quantities from specific batches with stock overdraft prevention.
   - Automatically updates `QTY STORAGE` in Google Sheets.
3. **Automated Audit Logging (`STOCK_OUT_LOG`)**:
   - Records every transaction with timestamps, medicine details, batch expiry date, quantity deducted, remaining stock balance, department/remarks, and user credentials.
4. **Zero-Stock Replenishment & In-Place Editing**:
   - Dedicated tab to review 0-quantity items, change the expiry date to the incoming batch, and replenish quantity directly.
5. **FEFO Expiry Risk Classification**:
   - 🔴 **2026 Critical / Immediate Risk** (FEFO priority dispensing)
   - 🟠 **2027 Near-Term Risk**
   - 🟢 **2028+ Safe Stock**
   - ⚠️ **Missing Expiry Audit Alerts**

---

## 📁 Repository Structure

```
├── gas_project/                      # Google Apps Script Source Files
│   ├── Code.gs                       # Backend controller, menu & sheet APIs
│   ├── Index.html                    # Main responsive Single-Page UI
│   ├── Styles.html                   # Clinical CSS stylesheet & badges
│   ├── JavaScript.html               # Frontend logic & RPC handlers
│   └── README_SETUP.md               # Step-by-step GAS setup guide
├── analyze.ps1                       # PowerShell Inventory Analysis Script
├── run_analysis.ps1                  # Comprehensive Expiry Profiling Report
├── sheet_1609045579.csv              # Raw inventory export snapshot
└── NEW RAW FILE__EXPIRY_2026.xlsx    # Raw warehouse inventory workbook
```

---

## 🚀 Setup & Deployment Guide

For full instructions on deploying this to Google Sheets or as a standalone Web App, see [`gas_project/README_SETUP.md`](gas_project/README_SETUP.md).

---

## 👥 Institution

**Amang Rodriguez Memorial Medical Center (ARMMC)**  
*Pharmacy Storage & Inventory Management*
