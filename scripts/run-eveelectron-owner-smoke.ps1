param(
  [string] $EveElectronRoot = "E:\Projects\EveElectron",
  [string] $AetheriaRoot = "E:\Projects\Aetheria"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $EveElectronRoot "eve-runtime-capability.json"
$packagePath = Join-Path $EveElectronRoot "package.json"
$shellPath = Join-Path $EveElectronRoot "src\eve-electron-shell.mjs"
$windowPath = Join-Path $EveElectronRoot "src\window-host.mjs"
$preloadPath = Join-Path $EveElectronRoot "src\eve-provider-preload.cjs"
$preloadEntryPath = Join-Path $EveElectronRoot "src\eve-provider-preload-entry.cjs"
$rendererRuntimePath = Join-Path $EveElectronRoot "src\eve-electron-renderer.mjs"
foreach ($path in @($manifestPath, $packagePath, $shellPath, $windowPath, $preloadPath, $preloadEntryPath, $rendererRuntimePath)) {
  if (-not (Test-Path -LiteralPath $path)) { throw "EveElectron owner path missing: $path" }
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.schema -ne "gamecult.eve.runtime_capability.v1" -or $manifest.runtimeId -ne "electron-shell" -or $manifest.owner -ne "EveElectron") {
  throw "EveElectron owner manifest identity is invalid."
}
foreach ($feature in @("providerAdvertisements", "commandTransport", "surfaceTreeProjection", "securePreloadBridge", "windowLifecycle")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) { throw "EveElectron owner manifest missing feature: $feature" }
}

$main = Get-Content -LiteralPath (Join-Path $AetheriaRoot "Aetheria.Rts.Web\Electron\main.ts") -Raw
$renderer = Get-Content -LiteralPath (Join-Path $AetheriaRoot "Aetheria.Rts.Web\Client\app.ts") -Raw
$preloadEntry = Get-Content -LiteralPath $preloadEntryPath -Raw
$rendererRuntime = Get-Content -LiteralPath $rendererRuntimePath -Raw
foreach ($symbol in @("createEveElectronWindow", "registerEveWindowControls", "@gamecult/eve-electron")) {
  if (-not $main.Contains($symbol)) { throw "Aetheria Electron host does not consume owner symbol: $symbol" }
}
if (-not $main.Contains("eve-provider-preload-entry.cjs") -or -not $preloadEntry.Contains("installEveProviderBridge")) {
  throw "Aetheria host does not consume EveElectron's standalone provider preload."
}
if (Test-Path -LiteralPath (Join-Path $AetheriaRoot "Aetheria.Rts.Web\Electron\preload.cjs")) {
  throw "Aetheria still owns a product preload."
}
if (-not $renderer.Contains("mountEveElectronProvider") -or
    -not $rendererRuntime.Contains("eveProvider.providerAdvertisement") -or
    $renderer.Contains("window.aetheriaRts")) {
  throw "Aetheria renderer has not transferred generic provider authority to EveElectron."
}

Push-Location $EveElectronRoot
try {
  node --test test/*.test.mjs test/*.test.cjs
  if ($LASTEXITCODE -ne 0) { throw "EveElectron owner tests failed with exit code $LASTEXITCODE" }
  npm pack --dry-run | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "EveElectron owner package smoke failed with exit code $LASTEXITCODE" }
  powershell -ExecutionPolicy Bypass -File scripts/capture-conformance.ps1 -EveRoot $projectRoot
  if ($LASTEXITCODE -ne 0) { throw "EveElectron owner capture smoke failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

Write-Host "EveElectron owner smoke passed: $EveElectronRoot"
