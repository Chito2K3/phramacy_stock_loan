$csv = Import-Csv -Path 'sheet_1609045579.csv'

$data = @()
foreach ($row in $csv) {
    $code = "$($row.'ITEM CODE')".Trim()
    if ([string]::IsNullOrWhiteSpace($code)) { continue }
    
    $desc = "$($row.'ITEM DESCRIPTION')".Trim()
    $rawQty = "$($row.'QTY STORAGE  ')"
    $rawExp = "$($row.'EXP DATE ')".Trim()
    
    $cleanQty = $rawQty -replace '[^0-9.]', ''
    $qty = 0
    if ($cleanQty -ne '') {
        $qty = [double]$cleanQty
    }
    
    $yr = "NO EXPIRY / UNRECORDED"
    $month = "N/A"
    if ($rawExp -match '^([A-Za-z]{3})-(\d{2})$') {
        $month = $matches[1]
        $yr = "20" + $matches[2]
    } elseif ($rawExp -match '20(\d{2})') {
        $yr = "20" + $matches[1]
    }
    
    $data += [PSCustomObject]@{
        ItemCode = $code
        ItemDesc = $desc
        Qty = $qty
        ExpDate = if ($rawExp) { $rawExp } else { "N/A" }
        ExpMonth = $month
        ExpYear = $yr
    }
}

$totalRecords = $data.Count
$sumQty = ($data | Measure-Object -Property Qty -Sum).Sum

Write-Host "================================================================================"
Write-Host "                HOSPITAL PHARMACY STORAGE INVENTORY ANALYSIS REPORT             "
Write-Host "================================================================================"
Write-Host "Total Inventory Line Items: $totalRecords"
Write-Host "Total Quantity in Storage : $($sumQty.ToString('N0')) units"
Write-Host "Unique Item Codes         : $(($data | Select-Object -ExpandProperty ItemCode -Unique).Count)"
Write-Host "Unique Item Descriptions  : $(($data | Select-Object -ExpandProperty ItemDesc -Unique).Count)"

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "1. EXPIRY BREAKDOWN BY YEAR"
Write-Host "--------------------------------------------------------------------------------"
$byYear = $data | Group-Object ExpYear | Sort-Object Name
$byYear | Select-Object @{N="Expiry Year";E={$_.Name}}, @{N="Line Items";E={$_.Count}}, @{N="Total Quantity";E={ (($_.Group | Measure-Object -Property Qty -Sum).Sum).ToString("N0") }}, @{N="% of Total Qty";E={ "{0:P2}" -f ((($_.Group | Measure-Object -Property Qty -Sum).Sum) / $sumQty) }} | Format-Table -AutoSize

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "2. MONTHLY EXPIRY PROFILE FOR 2026 & 2027 (IMMEDIATE & NEAR-TERM RISK)"
Write-Host "--------------------------------------------------------------------------------"
$nearTerm = $data | Where-Object { $_.ExpYear -in @('2026', '2027') }
$nearTerm | Group-Object ExpDate | Sort-Object @{Expression={
    $d = $_.Name
    if ($d -match '([A-Za-z]{3})-(\d{2})') {
        [DateTime]::ParseExact("01-$($matches[1])-20$($matches[2])", "dd-MMM-yyyy", [System.Globalization.CultureInfo]::InvariantCulture)
    } else { [DateTime]::MaxValue }
}} | Select-Object @{N="Expiry Period";E={$_.Name}}, @{N="Batch Count";E={$_.Count}}, @{N="Total Qty";E={ (($_.Group | Measure-Object -Property Qty -Sum).Sum).ToString("N0") }} | Format-Table -AutoSize

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "3. CRITICAL ITEMS EXPIRING IN 2026 (CURRENT YEAR EXPIRED / EXPIRING SOON)"
Write-Host "--------------------------------------------------------------------------------"
$data | Where-Object { $_.ExpYear -eq '2026' } | Sort-Object ExpDate, Qty -Descending | Select-Object ExpDate, ItemCode, ItemDesc, @{N="Qty (Units)";E={$_.Qty.ToString("N0")}} | Format-Table -AutoSize

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "4. TOP 15 HIGH-QUANTITY ITEMS EXPIRING IN 2027"
Write-Host "--------------------------------------------------------------------------------"
$data | Where-Object { $_.ExpYear -eq '2027' } | Sort-Object Qty -Descending | Select-Object -First 15 | Select-Object ExpDate, ItemCode, ItemDesc, @{N="Qty (Units)";E={$_.Qty.ToString("N0")}} | Format-Table -AutoSize

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "5. TOP 15 LARGEST INVENTORY HOLDINGS OVERALL (BY TOTAL QUANTITY)"
Write-Host "--------------------------------------------------------------------------------"
$topStock = $data | Group-Object ItemDesc | Select-Object @{N="Item Description";E={$_.Name}}, @{N="Total Qty";E={ ($_.Group | Measure-Object -Property Qty -Sum).Sum }}, @{N="Batch Count";E={$_.Count}} | Sort-Object "Total Qty" -Descending | Select-Object -First 15
$topStock | Select-Object "Item Description", @{N="Total Qty (Units)";E={$_.("Total Qty").ToString("N0")}}, "Batch Count" | Format-Table -AutoSize

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "6. INVENTORY SOURCE CLASSIFICATION (DONATION VS REGULAR)"
Write-Host "--------------------------------------------------------------------------------"
$data | Group-Object {
    if ($_.ItemCode -like "DMDON*") { "Donation / DOH Program (DMDON)" }
    elseif ($_.ItemCode -like "DMR*") { "Regular Procurement (DMR)" }
    else { "Other / Non-Standard" }
} | Select-Object @{N="Category";E={$_.Name}}, @{N="Line Items";E={$_.Count}}, @{N="Total Qty (Units)";E={ (($_.Group | Measure-Object -Property Qty -Sum).Sum).ToString("N0") }}, @{N="% of Total Qty";E={ "{0:P2}" -f ((($_.Group | Measure-Object -Property Qty -Sum).Sum) / $sumQty) }} | Format-Table -AutoSize

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "7. HIGH-VALUE / CRITICAL SPECIALTY MEDICINES IDENTIFIED"
Write-Host "--------------------------------------------------------------------------------"
$specialty = $data | Where-Object {
    $_.ItemDesc -match "ALTEPLASE|CICLOSPORIN|IMMUNOGLOBULIN|ZOLEDRONIC|DAPAGLIFLOZIN|APIXABAN|CLOZAPINE|OSELTAMIVIR"
} | Sort-Object ExpYear, ItemDesc
$specialty | Select-Object ExpDate, ItemCode, ItemDesc, @{N="Qty (Units)";E={$_.Qty.ToString("N0")}} | Format-Table -AutoSize

Write-Host "`n--------------------------------------------------------------------------------"
Write-Host "8. ITEMS MISSING EXPIRY DATES (RECORD AUDIT REQUIRED)"
Write-Host "--------------------------------------------------------------------------------"
$data | Where-Object { $_.ExpYear -eq 'NO EXPIRY / UNRECORDED' } | Select-Object ItemCode, ItemDesc, @{N="Qty (Units)";E={$_.Qty.ToString("N0")}} | Format-Table -AutoSize
