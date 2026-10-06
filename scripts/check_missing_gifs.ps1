$raw = Get-Content "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\js\heroes_data.js" -Raw
$matches = [regex]::Matches($raw, 'npc_dota_hero_([a-zA-Z0-9_]+)')
$allHeroes = @()
foreach ($m in $matches) {
  $n = $m.Groups[1].Value
  if ($n -notin $allHeroes) { $allHeroes += $n }
}

$existing = Get-ChildItem "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\gifs\*.gif" | ForEach-Object { $_.BaseName }

$missing = @()
foreach ($h in $allHeroes) {
  if ($h -notin $existing) {
    $missing += $h
  }
}

Write-Output ("Total heroes: " + $allHeroes.Count)
Write-Output ("Have GIF: " + ($allHeroes.Count - $missing.Count))
Write-Output ("Missing GIF: " + $missing.Count)
Write-Output ("Missing list: " + ($missing -join ", "))
