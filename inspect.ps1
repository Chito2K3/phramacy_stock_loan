$lines = Get-Content 'sheet_1609045579.csv'
Write-Host "Header line: $($lines[0])"
Write-Host "Row 1: $($lines[1])"
Write-Host "Row 2: $($lines[2])"

$csv = Import-Csv -Path 'sheet_1609045579.csv'
Write-Host "Count of items: $($csv.Count)"
$first = $csv[0]
foreach ($prop in $first.psobject.Properties) {
    Write-Host "Property: '$($prop.Name)' -> '$($prop.Value)'"
}
