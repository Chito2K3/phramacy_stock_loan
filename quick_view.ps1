$csv = Import-Csv 'sheet_1609045579.csv'
$data = @()
foreach ($row in $csv) {
    $code = "$($row.'ITEM CODE')".Trim()
    if ([string]::IsNullOrWhiteSpace($code)) { continue }
    $desc = "$($row.'ITEM DESCRIPTION')".Trim()
    $rawQty = "$($row.'QTY STORAGE  ')"
    $rawExp = "$($row.'EXP DATE ')".Trim()
    $cleanQty = $rawQty -replace '[^0-9.]', ''
    $qty = 0
    if ($cleanQty -ne '') { $qty = [double]$cleanQty }
    $yr = "NO EXPIRY / UNRECORDED"
    if ($rawExp -match '([A-Za-z]+)-(\d{2})') { $yr = "20" + $matches[2] }
    elseif ($rawExp -match '20(\d{2})') { $yr = "20" + $matches[1] }
    $data += [PSCustomObject]@{ ItemCode=$code; ItemDesc=$desc; Qty=$qty; ExpDate=$rawExp; ExpYear=$yr }
}

Write-Host "--- EXPIRY BY YEAR ---"
$data | Group-Object ExpYear | Sort-Object Name | Select-Object Name, Count, @{N='TotalQty';E={(($_.Group | Measure-Object -Property Qty -Sum).Sum).ToString('N0')}} | Format-Table -AutoSize

Write-Host "`n--- 2026 CRITICAL EXPIRY ITEMS ---"
$data | Where-Object { $_.ExpYear -eq '2026' } | Sort-Object ExpDate, Qty -Descending | Select-Object ExpDate, ItemCode, ItemDesc, @{N='Qty';E={$_.Qty.ToString('N0')}} | Format-Table -AutoSize
