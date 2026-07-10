param(
  [string] $EveElectronRoot = "E:\Projects\EveElectron",
  [string] $AetheriaRoot = "E:\Projects\Aetheria"
)

$ErrorActionPreference = "Stop"
$manifestPath = Join-Path $EveElectronRoot "eve-runtime-capability.json"
$packagePath = Join-Path $EveElectronRoot "package.json"
$shellPath = Join-Path $EveElectronRoot "src\eve-electron-shell.mjs"
$windowPath = Join-Path $EveElectronRoot "src\window-host.mjs"
$preloadPath = Join-Path $EveElectronRoot "src\eve-provider-preload.cjs"
foreach ($path in @($manifestPath, $packagePath, $shellPath, $windowPath, $preloadPath)) {
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
$preload = Get-Content -LiteralPath (Join-Path $AetheriaRoot "Aetheria.Rts.Web\Electron\preload.cjs") -Raw
$renderer = Get-Content -LiteralPath (Join-Path $AetheriaRoot "Aetheria.Rts.Web\Client\app.ts") -Raw
foreach ($symbol in @("createEveElectronWindow", "registerEveWindowControls", "@gamecult/eve-electron")) {
  if (-not $main.Contains($symbol)) { throw "Aetheria Electron host does not consume owner symbol: $symbol" }
}
if (-not $preload.Contains("installEveProviderBridge") -or -not $preload.Contains("@gamecult/eve-electron/preload")) {
  throw "Aetheria preload does not consume EveElectron's generic provider bridge."
}
if ($preload.Contains('eveSurface: request =>') -or $preload.Contains('submitEveCommand: request =>')) {
  throw "Aetheria product namespace still publishes duplicate generic Eve methods."
}
if (-not $renderer.Contains("window.eveProvider.providerAdvertisement") -or $renderer.Contains("window.aetheriaRts.eveProviderAdvertisement")) {
  throw "Aetheria renderer has not transferred generic provider authority to window.eveProvider."
}

Push-Location $EveElectronRoot
try {
  node --test test/*.test.mjs test/*.test.cjs
  if ($LASTEXITCODE -ne 0) { throw "EveElectron owner tests failed with exit code $LASTEXITCODE" }
  npm pack --dry-run | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "EveElectron owner package smoke failed with exit code $LASTEXITCODE" }
} finally {
  Pop-Location
}

Write-Host "EveElectron owner smoke passed: $EveElectronRoot"
