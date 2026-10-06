$ErrorActionPreference = 'Continue'

$gifsDir = "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\gifs"
if (-not (Test-Path $gifsDir)) {
  New-Item -ItemType Directory -Path $gifsDir -Force | Out-Null
}

$raw = Get-Content "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\js\heroes_data.js" -Raw
$matches = [regex]::Matches($raw, 'npc_dota_hero_([a-zA-Z0-9_]+)')
$shortNames = @()
foreach ($m in $matches) {
  $n = $m.Groups[1].Value
  if ($n -notin $shortNames) { $shortNames += $n }
}

Write-Output ("Found " + $shortNames.Count + " heroes.")

$custom = @{
  "shadow_fiend" = "https://media.tenor.com/Hmp2fYfiM88AAAAM/requiem-of-souls-zxc.gif";
  "nevermore"    = "https://media.tenor.com/Hmp2fYfiM88AAAAM/requiem-of-souls-zxc.gif";
  "pudge"        = "https://media.tenor.com/3mYiU6n2x2YAAAAM/dota-pudge.gif";
  "antimage"     = "https://media.tenor.com/SFLWJdDKKBUAAAAM/antimage.gif";
  "invoker"      = "https://media.tenor.com/BSEQAtx0bvQAAAAM/dota2.gif";
  "juggernaut"   = "https://media.tenor.com/8vxZ8hS86JUAAAAM/juggernaut-dota2.gif";
  "axe"          = "https://media.tenor.com/eQlHDXgBiTYAAAAM/axe-come.gif";
  "witch_doctor" = "https://media.tenor.com/kyzmjrzbKP0AAAAM/dota2-witchdoctor.gif";
  "storm_spirit" = "https://media.tenor.com/k9K2j3P7F0kAAAAM/storm-spirit.gif";
  "rubick"       = "https://media.tenor.com/h5vWf_k5G6EAAAAM/rubick-dota.gif";
  "tinker"       = "https://media.tenor.com/C1mP5T7Q9-kAAAAM/dota-2-tinker.gif";
  "crystal_maiden" = "https://media.tenor.com/f9V1hXy4o2YAAAAM/crystal-maiden.gif";
  "phantom_assassin" = "https://media.tenor.com/G5Z5oE8I5s8AAAAM/pa-dota.gif";
  "techies"      = "https://media.tenor.com/6X2Q8F4H9rUAAAAM/techies-dota2.gif"
}

# Копируем Hoodwink
if (Test-Path "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\hoodwink_dance.gif") {
  Copy-Item "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\hoodwink_dance.gif" -Destination (Join-Path $gifsDir "hoodwink.gif") -Force
}

# Скачиваем кастомные
foreach ($k in $custom.Keys) {
  $dest = Join-Path $gifsDir ($k + ".gif")
  if (-not (Test-Path $dest)) {
    curl.exe -s -L --ssl-no-revoke -A "Mozilla/5.0" -o $dest $custom[$k]
    Write-Output ("Saved custom gif: " + $k + " (" + (Get-Item $dest).Length + " bytes)")
  }
}
