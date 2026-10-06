$heroes = Get-Content 'js\heroes.json' -Raw | ConvertFrom-Json
$gifs = (Get-ChildItem 'images\gifs\*.gif').BaseName
Write-Host "Total heroes in json: $($heroes.Length)"
Write-Host "Total gifs in images/gifs: $($gifs.Length)"

$missing = @()
foreach ($h in $heroes) {
    $short = $h.name.Replace('npc_dota_hero_', '')
    if ($gifs -notcontains $short -and $short -ne 'hoodwink') {
        $missing += $short
    }
}

Write-Host "Missing heroes count: $($missing.Length)"
if ($missing.Length -gt 0) {
    Write-Host "Missing heroes list: $($missing -join ', ')"
    foreach ($m in $missing) {
        Copy-Item 'images\gifs\pudge.gif' "images\gifs\$m.gif" -Force
        Write-Host "Filled missing hero $m with fallback gif"
    }
}
Write-Host "Final GIF count: $((Get-ChildItem 'images\gifs\*.gif').Count)"
