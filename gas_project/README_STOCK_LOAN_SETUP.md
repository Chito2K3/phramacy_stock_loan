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

## 📋 Google Sheet Column Setup (Non-Breaking)

In your spreadsheet:
- Sheet 1: **`UTANG`**
- Sheet 2: **`PAUTANG`**

The headers in Row 1 are:
| Col A | Col B | Col C | Col D | Col E | Col F | Col G | Col H | Col I | Col J *(Optional)* | Col K *(Optional)* |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **DATE** | **LENDER / BORROWER** | **DOC NO.** | **ITEM CODE** | **ITEM DESCRIPTION** | **QTY** | **STATUS** | **DATE OF PAYMENT** | **REMARKS** | **PARTIAL RETURNED / PAID** | **REMAINING BALANCE** |

> [!NOTE]
> Columns J & K are **optional**. If Columns J & K are present, numbers sync directly to them. If they are not added yet, the system works automatically by tracking installments in Remarks and calculating balances cleanly on the fly!

---

## 🚀 How to Deploy in Google Apps Script

### Step 1: Open Apps Script Editor
1. Open your Google Sheet: [PHARMACY LOAN STOCK MONITORING](https://docs.google.com/spreadsheets/d/1LlL_Zj-5ndXALLm1Xl-jG2RyNHllAlUDC9WSRnZpnek/edit?gid=1077903519#gid=1077903519).
2. Click **Extensions** > **Apps Script**.

### Step 2: Paste the Code Files
Inside the Apps Script editor:

1. **`Code.gs`** (Script file):
   - Replace the code in `Code.gs` with the code inside [`gas_project/StockLoan_Code.gs`](./StockLoan_Code.gs).

2. **`StockLoan_Index.html`** (HTML file):
   - Click **➕ (Add a file)** > **HTML**.
   - Name it `StockLoan_Index` (or if your file is already named `Index`, replace its contents with [`gas_project/StockLoan_Index.html`](./StockLoan_Index.html) and update the file reference in `Code.gs`).
   - Paste the code from [`gas_project/StockLoan_Index.html`](./StockLoan_Index.html).

3. Click **💾 Save project** (Ctrl + S).

---

### Step 3: Update or Create Web App Deployment
1. At the top right of Apps Script, click **Deploy** > **Manage deployments**.
2. Click the **✏️ Edit (pencil)** icon on your active Web App deployment.
3. Under **Version**, select **New version**.
4. Click **Deploy**.
5. Your Web App URL will now run the new partial payment tracking system!

---

## 💡 How to Use Partial Payment in the App
1. Open the Web App or click **💊 Stock Loan Management** > **Open Stock Loan Manager** inside Google Sheets.
2. Click **✏️ Pullout / Edit** on any loan row.
3. Select **PARTIAL** in the Status dropdown.
4. The **⚖️ Partial Settlement Tracker** will appear:
   - Enter how many units were returned today in **"➕ Add New Payment / Return Qty"**.
   - Watch the remaining balance and progress bar update automatically.
5. Click **💾 Save Changes**. The spreadsheet and web dashboard will update instantly!
