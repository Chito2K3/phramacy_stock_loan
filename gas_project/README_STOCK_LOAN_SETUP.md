# 💊 Pharmacy Stock Loan Management System — Partial Payment Setup

This documentation explains how to set up and update the **Stock Loan Management** Google Apps Script application connected to your Google Sheet (`PHARMACY LOAN STOCK MONITORING`).

---

## 🎯 What Was Updated for Partial Payments
1. **Full Partial Settlement Support for Both Tabs**:
   - **`UTANG` (Borrowed Loans)**: Supports partial payments returned by ARMMC to lending hospitals (e.g. Cainta Municipal, PCMC, Rizal Medical).
   - **`PAUTANG` (Lent Loans)**: Supports partial returns by borrowing facilities.
2. **Interactive Partial Settlement Calculator**:
   - Displays **Original QTY**, **Previously Settled**, and an **Add New Payment / Return Qty** field (e.g. `+240`).
   - Automatically computes cumulative settled units and **Remaining Balance**.
   - Dynamic progress bar showing settlement percentage (`% Settled`).
   - Auto-appends timestamped audit log to Remarks:
     `[YYYY-MM-DD] Partial settled: 240 pcs (Bal: 600 pcs)`
   - When remaining balance reaches `0`, prompts to transition status to `PAID`.
3. **Table & KPI Upgrades**:
   - QTY column visually breaks down: `Original QTY` + `Paid: X | Bal: Y` with progress bar.
   - Status badge shows `PARTIAL (50%)`.
   - Clicking the **PARTIAL SETTLEMENTS** top KPI card instantly filters to show all partial records.
4. **Enhanced Printable Report**:
   - Prints department-level report with total original loans, settled totals, and total outstanding debt/receivable balance.

---

## 📋 Google Sheet Column Setup (Streamlined)

In your spreadsheet:
- Sheet 1: **`UTANG`**
- Sheet 2: **`PAUTANG`**

The headers in Row 1 (with **Document No. removed**):
| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I *(Optional)* | Col J *(Optional)* |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **DATE** | **LENDER / BORROWER** | **ITEM CODE** | **ITEM DESCRIPTION** | **QTY** | **STATUS** | **DATE OF PAYMENT** | **REMARKS** | **PARTIAL RETURNED / PAID** | **REMAINING BALANCE** |

> [!TIP]
> **Dynamic Compatibility**: The app automatically detects whether your sheet has removed `Document No.` or still has it. You don't have to worry about broken alignments!

---

## 🚀 How to Deploy in Google Apps Script

### Step 1: Open Apps Script Editor
1. Open your Google Sheet: [PHARMACY LOAN STOCK MONITORING](https://docs.google.com/spreadsheets/d/1LlL_Zj-5ndXALLm1Xl-jG2RyNHllAlUDC9WSRnZpnek/edit?gid=1077903519#gid=1077903519).
2. Click **Extensions** > **Apps Script**.

### Step 2: Paste the Code Files
Inside the Apps Script editor:

1. **`Code.gs`** (Script file):
   - Replace the code in `Code.gs` with the code inside [`gas_project/Code.gs`](./Code.gs).

2. **`Index.html`** (HTML file):
   - Replace the code in `Index.html` with the code inside [`gas_project/Index.html`](./Index.html).

3. Click **💾 Save project** (Ctrl + S).

---

### Step 3: Update Web App Deployment
1. At the top right of Apps Script, click **Deploy** > **Manage deployments**.
2. Click the **✏️ Edit (pencil)** icon on your active Web App deployment.
3. Under **Version**, select **New version**.
4. Click **Deploy**.
5. Your Web App URL is now running the updated system!

---

## 🛠️ One-Click Menu Utilities in Google Sheets

When you open your spreadsheet, you will see the custom menu: **💊 Stock Loan Management**:
1. **🗑️ Remove Document No. Column from Sheets**:
   - Safely removes the Document No. column (Column C) across both `UTANG` and `PAUTANG` sheets and shifts following columns to the left.
2. **🔄 Fix / Sync Status Dropdowns & Roboto Font**:
   - Automatically sets the font of all records to **`Roboto`**.
   - Formats **REMARKS** to clip mode (stops text from spilling horizontally across empty columns).
   - Normalizes status values (e.g. fixes `"PARTIAL"` to exact dropdown chip `"PARTIAL PAYMENT"`).
   - Re-applies colored dropdown pill chips to all records.

---

## 🔠 Automatic Uppercase Input
All text fields in the web application (Facility, Item Code, Item Description, Remarks, Search) are styled with `text-transform: uppercase` and saved to Google Sheets strictly in **`UPPERCASE`**.
