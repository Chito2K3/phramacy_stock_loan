# 🏥 Pharmacy Expiry Monitoring (Amang Rodriguez Memorial Medical Center)

This custom Google Apps Script application connects directly to the ARMMC pharmacy inventory spreadsheet to monitor expiration dates (2026/2027/2028+), record stock-out dispensations, restock 0-quantity items, and automatically insert new batches grouped below existing batches.

---

## 🚀 How to Install in Google Sheets

### Step 1: Open Google Apps Script Editor
1. Open your Google Sheet: [Pharmacy Storage Spreadsheet](https://docs.google.com/spreadsheets/d/1sKJcZG-rnNN9_VknrbkxcuomegK1-CuY_iB81AQOFpc/edit?gid=1609045579#gid=1609045579).
2. In the top menu, click **Extensions** > **Apps Script**.

---

### Step 2: Create the 4 Script Files
Inside the Apps Script editor, create the following 4 files (delete any default `myFunction` in `Code.gs`):

#### 1. `Code.gs` (Script File)
* Click on `Code.gs` in the left sidebar.
* Replace the contents with the code inside [`gas_project/Code.gs`](./Code.gs).

#### 2. `Index.html` (HTML File)
* Click **➕ (Add a file)** > **HTML**.
* Name it `Index` (Apps Script will add `.html` automatically).
* Replace the contents with the code inside [`gas_project/Index.html`](./Index.html).

#### 3. `Styles.html` (HTML File)
* Click **➕ (Add a file)** > **HTML**.
* Name it `Styles`.
* Replace the contents with the code inside [`gas_project/Styles.html`](./Styles.html).

#### 4. `JavaScript.html` (HTML File)
* Click **➕ (Add a file)** > **HTML**.
* Name it `JavaScript`.
* Replace the contents with the code inside [`gas_project/JavaScript.html`](./JavaScript.html).

---

### Step 3: Save and Refresh
1. Click the **💾 Save project** icon at the top.
2. Go back to your Google Sheet tab and **refresh the browser page (F5)**.
3. You will now see a new menu item in Google Sheets:
   **`🏥 Pharmacy Storage App`**

---

## 🎯 How to Use the Features

### 1. ➕ Adding a Medicine or New Batch (Smart Row Insertion)
* Go to the **Add Medicine / New Batch** tab in the app.
* Type the **Item Code**:
  * **If the medicine already exists** (e.g. `DMR000451` Fluconazole): The system automatically detects all previous batches and will **insert the new row directly below the last batch** of that medicine!
  * **If the medicine is brand new**: It will append it to the end of the inventory list.
* Fill in Quantity and Expiry Date (e.g., `Dec-28`) and click **Save & Insert into Sheet**.

### 2. ➖ Quick Stock-Out / Dispensing
* In the **Inventory & Stock-Out** tab, search for the item or filter by 2026/2027 risk.
* Click the red **➖ Out** button on any batch.
* Enter how many units were dispensed (e.g., `50`).
* Click **Confirm Stock-Out**:
  * The storage quantity in your Google Sheet is instantly updated.
  * An entry is automatically created in the **`STOCK_OUT_LOG`** audit sheet.

### 3. 🔄 Restocking & Editing 0-Quantity Items
* Click the **Restock 0-Qty Items** tab.
* Click **Restock / Set New Expiry** on any zero-stock medicine.
* Update the **Expiry Date** and set the **New Quantity**.
* Saves directly into that row in the sheet!

### 4. 📋 Audit Log Sheet (`STOCK_OUT_LOG`)
* The system automatically maintains a dedicated sheet tab called `STOCK_OUT_LOG` recording:
  * Timestamp
  * Item Code & Description
  * Expiry Date
  * Quantity Taken Out
  * Previous Stock & Remaining Balance
  * Remarks / Department

---

## 🌐 (Optional) Deploy as Standalone Web App
If you want users to use the app on mobile or in a browser tab without seeing the raw spreadsheet:
1. In Apps Script, click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Description: `Pharmacy Inventory App`.
4. Execute as: `Me`.
5. Who has access: `Anyone with Google account` or `Anyone within organization`.
6. Click **Deploy** and copy the Web App URL!
