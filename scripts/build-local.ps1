$keyPath = Join-Path $PSScriptRoot "..\src-tauri\eytaa_updater.key"
if (Test-Path $keyPath) {
    $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -Raw $keyPath).Trim()
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "eytaa-release-key"
    Write-Host "Configured updater signing key from $keyPath"
} else {
    Write-Host "Warning: eytaa_updater.key not found at $keyPath"
}

npx tauri build
