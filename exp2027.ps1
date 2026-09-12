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

Write-Host "--- 2027 EXPIRY BY MONTH ---"
$data | Where-Object { $_.ExpYear -eq '2027' } | Group-Object ExpDate | Sort-Object @{Expression={
    $d = $_.Name
    if ($d -match '([A-Za-z]{3})-(\d{2})') {
        [DateTime]::ParseExact("01-$($matches[1])-20$($matches[2])", "dd-MMM-yyyy", [System.Globalization.CultureInfo]::InvariantCulture)
    } else { [DateTime]::MaxValue }
}} | Select-Object @{N="Month";E={$_.Name}}, Count, @{N="TotalQty";E={(($_.Group | Measure-Object -Property Qty -Sum).Sum).ToString('N0')}} | Format-Table -AutoSize
