$c = Get-Content 'css/style.css' -Raw -Encoding UTF8
$c = $c -replace 'rgba\(220,\s*38,\s*38,\s*([0-9\.]+)\)', 'rgba(14, 165, 233, $1)'
$c = $c -replace 'rgba\(220,\s*38,\s*38,\s*(\.[0-9]+)\)', 'rgba(14, 165, 233, $1)'
$c = $c -replace '#7f1d1d', '#0369a1'
$c = $c -replace '#dc2626', '#0ea5e9'
$c = $c -replace 'linear-gradient\(180deg, var\(--accent\), #7f1d1d\)', 'linear-gradient(180deg, #38bdf8, #0284c7)'
[System.IO.File]::WriteAllText('css/style.css', $c, [System.Text.Encoding]::UTF8)
Write-Host "Updated residual red colors in css/style.css"
