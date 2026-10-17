$keyPath = Join-Path $PSScriptRoot "..\src-tauri\eytaa_updater.key"
if (Test-Path $keyPath) {
    $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -Raw $keyPath).Trim()
    if (-not $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $env:EYTAU_UPDATER_KEY_PASSWORD
    }
    if ($env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
        Write-Host "Configured updater signing key from $keyPath"
    } else {
        Write-Warning "eytaa_updater.key found but signing password not set in environment (TAURI_SIGNING_PRIVATE_KEY_PASSWORD or EYTAU_UPDATER_KEY_PASSWORD)."
    }
} else {
    Write-Host "Warning: eytaa_updater.key not found at $keyPath"
}

npx tauri build
