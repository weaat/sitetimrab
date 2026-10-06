$ErrorActionPreference = 'Continue'

$gifsDir = "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\gifs"

$raw = Get-Content "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\js\heroes_data.js" -Raw
$matches = [regex]::Matches($raw, 'npc_dota_hero_([a-zA-Z0-9_]+)')
$allHeroes = @()
foreach ($m in $matches) {
  $n = $m.Groups[1].Value
  if ($n -notin $allHeroes) { $allHeroes += $n }
}

$existing = Get-ChildItem "$gifsDir\*.gif" | ForEach-Object { $_.BaseName }
$missing = @()
foreach ($h in $allHeroes) {
  if ($h -notin $existing) { $missing += $h }
}

Write-Output ("Starting download for " + $missing.Count + " missing heroes...")

# Словарь человекочитаемых имён для лучших поисковых запросов в Tenor
$heroQueries = @{
  "bloodseeker" = "bloodseeker dota";
  "mirana" = "mirana dota";
  "phantom_lancer" = "phantom lancer dota";
  "puck" = "puck dota";
  "razor" = "razor dota";
  "sand_king" = "sand king dota";
  "sven" = "sven dota";
  "tiny" = "tiny dota";
  "vengefulspirit" = "vengeful spirit dota";
  "kunkka" = "kunkka dota";
  "shadow_shaman" = "shadow shaman dota";
  "slardar" = "slardar dota";
  "lich" = "lich dota";
  "necrolyte" = "necrophos dota";
  "warlock" = "warlock dota";
  "beastmaster" = "beastmaster dota";
  "queenofpain" = "queen of pain dota";
  "venomancer" = "venomancer dota";
  "death_prophet" = "death prophet dota";
  "pugna" = "pugna dota";
  "templar_assassin" = "templar assassin dota";
  "viper" = "viper dota";
  "luna" = "luna dota";
  "dragon_knight" = "dragon knight dota";
  "dazzle" = "dazzle dota";
  "rattletrap" = "clockwerk dota";
  "leshrac" = "leshrac dota";
  "furion" = "natures prophet dota";
  "life_stealer" = "lifestealer dota";
  "dark_seer" = "dark seer dota";
  "clinkz" = "clinkz dota";
  "omniknight" = "omniknight dota";
  "enchantress" = "enchantress dota";
  "huskar" = "huskar dota";
  "night_stalker" = "night stalker dota";
  "broodmother" = "broodmother dota";
  "bounty_hunter" = "bounty hunter dota";
  "weaver" = "weaver dota";
  "jakiro" = "jakiro dota";
  "batrider" = "batrider dota";
  "chen" = "chen dota";
  "spectre" = "spectre dota";
  "ancient_apparition" = "ancient apparition dota";
  "doom_bringer" = "doom dota";
  "spirit_breaker" = "spirit breaker dota";
  "gyrocopter" = "gyrocopter dota";
  "alchemist" = "alchemist dota";
  "silencer" = "silencer dota";
  "obsidian_destroyer" = "outworld destroyer dota";
  "lycan" = "lycan dota";
  "brewmaster" = "brewmaster dota";
  "shadow_demon" = "shadow demon dota";
  "lone_druid" = "lone druid dota";
  "chaos_knight" = "chaos knight dota";
  "meepo" = "meepo dota";
  "treant" = "treant protector dota";
  "undying" = "undying dota";
  "disruptor" = "disruptor dota";
  "nyx_assassin" = "nyx assassin dota";
  "naga_siren" = "naga siren dota";
  "keeper_of_the_light" = "kotl dota";
  "wisp" = "io dota";
  "visage" = "visage dota";
  "medusa" = "medusa dota";
  "troll_warlord" = "troll warlord dota";
  "centaur" = "centaur warrunner dota";
  "magnataur" = "magnus dota";
  "shredder" = "timbersaw dota";
  "skywrath_mage" = "skywrath mage dota";
  "abaddon" = "abaddon dota";
  "elder_titan" = "elder titan dota";
  "legion_commander" = "legion commander dota";
  "ember_spirit" = "ember spirit dota";
  "earth_spirit" = "earth spirit dota";
  "abyssal_underlord" = "underlord dota";
  "phoenix" = "phoenix dota";
  "oracle" = "oracle dota";
  "winter_wyvern" = "winter wyvern dota";
  "arc_warden" = "arc warden dota";
  "dark_willow" = "dark willow dota";
  "pangolier" = "pangolier dota";
  "grimstroke" = "grimstroke dota";
  "snapfire" = "snapfire dota";
  "mars" = "mars dota";
  "ringmaster" = "ringmaster dota";
  "dawnbreaker" = "dawnbreaker dota";
  "kez" = "dota 2 kez";
  "largo" = "dota 2 meme"
}

# Пул резервных мемов Dota 2 если конкретный герой не найден
$fallbackMemes = @(
  "https://media.tenor.com/BSEQAtx0bvQAAAAM/dota2.gif",
  "https://media.tenor.com/5oHeI8sET1oAAAAM/dota-hero.gif",
  "https://media.tenor.com/kyzmjrzbKP0AAAAM/dota2-witchdoctor.gif",
  "https://media.tenor.com/eQlHDXgBiTYAAAAM/axe-come.gif",
  "https://media.tenor.com/8vxZ8hS86JUAAAAM/juggernaut-dota2.gif",
  "https://media.tenor.com/SFLWJdDKKBUAAAAM/antimage.gif",
  "https://media.tenor.com/3mYiU6n2x2YAAAAM/dota-pudge.gif"
)
$fallbackIdx = 0

foreach ($short in $missing) {
  $q = $heroQueries[$short]
  if (-not $q) { $q = "$short dota" }

  $slug = ($q -replace "[^a-zA-Z0-9]+", "-").ToLower().Trim("-")
  $searchUrl = "https://tenor.com/search/${slug}-gifs"
  $dest = Join-Path $gifsDir ($short + ".gif")

  $gifUrl = $null
  try {
    $html = curl.exe -s -L --ssl-no-revoke -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" $searchUrl
    $matches = [regex]::Matches($html, 'https://media\.tenor\.com/[a-zA-Z0-9_\-]+AAAAM/[a-zA-Z0-9_\-]+\.gif')
    if ($matches.Count -gt 0) {
      $gifUrl = $matches[0].Value
    }
  } catch {}

  if (-not $gifUrl) {
    # Берём мемный fallback из пула
    $gifUrl = $fallbackMemes[$fallbackIdx % $fallbackMemes.Count]
    $fallbackIdx++
  }

  if ($gifUrl) {
    try {
      curl.exe -s -L --ssl-no-revoke -A "Mozilla/5.0" -o $dest $gifUrl
      if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 5000)) {
        Write-Output ("Saved GIF for: " + $short + " (" + (Get-Item $dest).Length + " bytes)")
      } else {
        # Если не скачалось, копируем существующий мем
        $fallbackSrc = Join-Path $gifsDir "pudge.gif"
        if (Test-Path $fallbackSrc) { Copy-Item $fallbackSrc $dest -Force }
      }
    } catch {}
  }
}

$count = (Get-ChildItem "$gifsDir\*.gif").Count
Write-Output ("DONE! Total GIFs in images/gifs/: " + $count)
