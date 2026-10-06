param()

$desktopZip = "C:\Users\wtt\Desktop\DotaArena2026.zip"
$localZip   = "C:\Users\wtt\.gemini\antigravity-cli\scratch\web_project_Student\DotaArena2026.zip"

if (Test-Path $desktopZip) {
    Remove-Item $desktopZip -Force
}
if (Test-Path $localZip) {
    Remove-Item $localZip -Force
}

Write-Host "Creating ZIP archive on Desktop..."
Get-ChildItem -Path . -Exclude '.git', '*.zip' | Compress-Archive -DestinationPath $desktopZip -Force

Copy-Item $desktopZip $localZip -Force
$size = (Get-Item $desktopZip).Length
Write-Host "Archive ready! Size: $size bytes ($([math]::Round($size / 1MB, 2)) MB)"
