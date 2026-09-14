# 💊 Pharmacy Stock Loan Management System
### Amang Rodriguez Memorial Medical Center (ARMMC)
**Pharmacy Department — Materials & Supply Management**

A custom Google Apps Script web application and Google Sheets integration designed to manage, monitor, and audit hospital pharmacy stock loans:
- **`UTANG` (Borrowed Loans)**: Medicines borrowed from other hospitals/facilities (e.g. Cainta Municipal Hospital, PCMC, Rizal Medical Center) and partial return payments made by ARMMC.
- **`PAUTANG` (Lent Loans)**: Medicines released/lent to other facilities and partial settlements returned by borrowing hospitals.

---

## ✨ Key Features
1. **Interactive Dashboard**: Real-time KPI summaries for Total Loans, Unpaid Records, Paid/Settled, and Partial Settlements.
2. **Partial Payment & Settlement Tracker**:
   - Calculates cumulative settled quantities and remaining balances automatically.
   - Dynamic progress bar showing `% Settled`.
   - "➕ Add New Payment / Return Qty" quick incremental entry.
   - Automatically maintains a timestamped audit trail in Remarks:
     `[YYYY-MM-DD] Partial settled: 240 pcs (Bal: 600 pcs)`
   - Zero-balance safeguard: alerts when balance reaches 0 so the loan can transition to `PAID`.
3. **Advanced Filters & Autocomplete**: Filter by Lender/Borrower facility with datalist suggestions, search by keywords, and filter by status (`ALL`, `UNPAID`, `PAID`, `PARTIAL`, `DONATION`).
4. **Audit-Ready Printable Report**: Formatted print preview with department header, summary boxes, outstanding balance totals, and signature lines for hospital pharmacists and custodians.
5. **Non-Breaking Sheet Compatibility**: Syncs directly with existing Google Sheet columns while supporting optional dedicated balance columns (`PARTIAL RETURNED` & `REMAINING BALANCE`).

---

## 📁 Repository Structure
```text
├── gas_project/
│   ├── Code.gs                   # Apps Script backend API (getLoanData, updateLoanRecord, addNewLoanRecord)
│   ├── Index.html                 # Complete standalone frontend web application (HTML, CSS, JS)
│   ├── StockLoan_Code.gs         # Reference copy of backend script
│   ├── StockLoan_Index.html      # Reference copy of frontend HTML
│   └── README_STOCK_LOAN_SETUP.md # Detailed setup and deployment guide
└── README.md
```

---

## 🚀 Setup & Deployment
Refer to [`gas_project/README_STOCK_LOAN_SETUP.md`](./gas_project/README_STOCK_LOAN_SETUP.md) for full instructions on copying the files into your Google Spreadsheet Apps Script editor and deploying the Web App.
