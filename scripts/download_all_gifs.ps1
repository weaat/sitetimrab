$ErrorActionPreference = 'Continue'

$gifsDir = "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\gifs"
if (-not (Test-Path $gifsDir)) {
  New-Item -ItemType Directory -Path $gifsDir -Force | Out-Null
}

# 1. Специфические культовые / zxc / мемные гифки для ключевых героев
$customGifs = @{
  "shadow_fiend" = "https://media.tenor.com/Hmp2fYfiM88AAAAM/requiem-of-souls-zxc.gif";
  "nevermore"    = "https://media.tenor.com/Hmp2fYfiM88AAAAM/requiem-of-souls-zxc.gif";
  "pudge"        = "https://media.tenor.com/3mYiU6n2x2YAAAAM/dota-pudge.gif";
  "antimage"     = "https://media.tenor.com/SFLWJdDKKBUAAAAM/antimage.gif";
  "juggernaut"   = "https://media.tenor.com/8vxZ8hS86JUAAAAM/juggernaut-dota2.gif";
  "invoker"      = "https://media.tenor.com/BSEQAtx0bvQAAAAM/dota2.gif";
  "axe"          = "https://media.tenor.com/eQlHDXgBiTYAAAAM/axe-come.gif";
  "witch_doctor" = "https://media.tenor.com/kyzmjrzbKP0AAAAM/dota2-witchdoctor.gif";
  "storm_spirit" = "https://media.tenor.com/k9K2j3P7F0kAAAAM/storm-spirit.gif";
  "rubick"       = "https://media.tenor.com/h5vWf_k5G6EAAAAM/rubick-dota.gif";
  "tinker"       = "https://media.tenor.com/C1mP5T7Q9-kAAAAM/dota-2-tinker.gif";
  "crystal_maiden" = "https://media.tenor.com/f9V1hXy4o2YAAAAM/crystal-maiden.gif";
  "phantom_assassin" = "https://media.tenor.com/G5Z5oE8I5s8AAAAM/pa-dota.gif";
  "techies"      = "https://media.tenor.com/6X2Q8F4H9rUAAAAM/techies-dota2.gif"
}

# Копируем Hoodwink если есть
if (Test-Path "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\hoodwink_dance.gif") {
  Copy-Item "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\images\hoodwink_dance.gif" -Destination (Join-Path $gifsDir "hoodwink.gif") -Force
}

# 2. Получаем всех 127 героев
$raw = Get-Content "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\js\heroes_data.js" -Raw
$jsonStr = [regex]::Match($raw, '\[[\s\S]*\]').Value
$heroes = $jsonStr | ConvertFrom-Json


Write-Output ("Total heroes to process: " + $heroes.Count)

$downloadedCount = 0

foreach ($hero in $heroes) {
  $short = $hero.name -replace "npc_dota_hero_", ""
  $locName = $hero.localized_name
  $dest = Join-Path $gifsDir ($short + ".gif")

  # Если уже есть валидная гифка (> 10KB), пропускаем
  if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 10000)) {
    $downloadedCount++
    continue
  }

  $url = $null

  # Проверяем кастомную базу
  if ($customGifs.ContainsKey($short)) {
    $url = $customGifs[$short]
  }

  # Если нет в кастомной базе, ищем на Tenor
  if (-not $url) {
    $queries = @(
      ($locName + " dota"),
      ($short + " dota 2"),
      ($locName + " dota 2")
    )

    foreach ($q in $queries) {
      $searchSlug = ($q -replace "[^a-zA-Z0-9]+", "-").ToLower().Trim("-")
      $searchUrl = "https://tenor.com/search/${searchSlug}-gifs"
      try {
        $html = curl.exe -s -L --ssl-no-revoke -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" $searchUrl
        $matches = [regex]::Matches($html, 'https://media\.tenor\.com/[a-zA-Z0-9_\-]+AAAAM/[a-zA-Z0-9_\-]+\.gif')
        if ($matches.Count -gt 0) {
          $url = $matches[0].Value
          break
        }
      } catch {}
    }
  }

  # Если всё ещё нет гифки, берём резервную dota 2 гифку
  if (-not $url) {
    $url = "https://media.tenor.com/BSEQAtx0bvQAAAAM/dota2.gif"
  }

  # Скачиваем гифку
  if ($url) {
    try {
      curl.exe -s -L --ssl-no-revoke -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -o $dest $url
      if ((Test-Path $dest) -and ((Get-Item $dest).Length -gt 5000)) {
        Write-Output ("OK: " + $short + " (" + (Get-Item $dest).Length + " bytes)")
        $downloadedCount++
      } else {
        Write-Output ("FAIL: " + $short)
      }
    } catch {
      Write-Output ("ERROR: " + $short)
    }
  }
}

Write-Output ("Finished downloading. Total GIFs ready: " + $downloadedCount + " / " + $heroes.Count)
