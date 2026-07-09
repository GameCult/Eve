param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-electron\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveElectron runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "electron-shell") {
  throw "Unexpected EveElectron runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveElectron provider shell status: $($manifest.lifecycle.test.status)"
}

foreach ($feature in @("providerAdvertisements", "commandTransport", "surfaceTreeProjection", "pluginProjection")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveElectron provider shell missing supported feature: $feature"
  }
}

foreach ($pluginId in @("sai.vn", "norn.graph", "tex.math")) {
  $supported = @($manifest.supportedPlugins) | Where-Object { $_.pluginId -eq $pluginId } | Select-Object -First 1
  if (-not $supported) {
    throw "EveElectron provider shell missing supported plugin projection: $pluginId"
  }
}

$worldSurfaceLoweringClaims = @()
if ($null -ne $manifest.worldSurfaceLowering) {
  $worldSurfaceLoweringClaims = @($manifest.worldSurfaceLowering)
}
if ($worldSurfaceLoweringClaims.Count -ne 1) {
  throw "EveElectron must claim exactly one provider world-surface lowering target"
}
$worldSurfaceLoweringClaim = $worldSurfaceLoweringClaims | Where-Object { $_.targetId -eq "electron-shell" } | Select-Object -First 1
if (-not $worldSurfaceLoweringClaim) {
  throw "EveElectron missing electron-shell world-surface lowering claim"
}
foreach ($surfaceKind in @("interactive-world", "interactive-world-editor")) {
  if (-not (@($worldSurfaceLoweringClaim.surfaceKinds) -contains $surfaceKind)) {
    throw "EveElectron world-surface claim missing surface kind: $surfaceKind"
  }
}
foreach ($projectionKind in @("provider-authored-world-surface", "provider-authored-world-editor-surface")) {
  if (-not (@($worldSurfaceLoweringClaim.projectionKinds) -contains $projectionKind)) {
    throw "EveElectron world-surface claim missing projection kind: $projectionKind"
  }
}
if ($worldSurfaceLoweringClaim.supportLevel -ne "electron-shell-surface-tree-command-surface") {
  throw "Unexpected EveElectron support level: $($worldSurfaceLoweringClaim.supportLevel)"
}
if ($worldSurfaceLoweringClaim.ownership -ne "runtime-lowers-provider-world-surface-without-owning-world-state") {
  throw "Unexpected EveElectron ownership: $($worldSurfaceLoweringClaim.ownership)"
}
foreach ($evidencePath in @($worldSurfaceLoweringClaim.evidencePaths)) {
  $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
  if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
    throw "EveElectron world-surface claim missing evidence path: $evidencePath"
  }
}

$expectedFiles = @(
  "runtimes\incubating\eve-electron\package.json",
  "runtimes\incubating\eve-electron\src\eve-electron-shell.mjs",
  "runtimes\incubating\eve-electron\test\eve-electron-shell.test.mjs",
  "scripts\run-eveelectron-capture-contract-smoke.ps1",
  "tools\eveelectron\eveelectron-capture-contract.mjs"
)

foreach ($relativePath in $expectedFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveElectron provider shell missing file: $relativePath"
  }
}

$shellSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-electron\src\eve-electron-shell.mjs") -Raw
foreach ($symbol in @("EveElectronShell", "selectSurface", "lowerSurface", "createCommandIntent", "normalizeSurfaceDocument", "buildShellNode", "buildPluginProjection", "shellElementKind", "sai.vn", "norn.graph", "tex.math", "sidecar-advertised-plugin-abi", "worldInteraction", "commandBoundary", "receiptSchema", "electron-shell")) {
  if (-not $shellSource.Contains($symbol)) {
    throw "EveElectron provider shell source missing symbol: $symbol"
  }
}

$testSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-electron\test\eve-electron-shell.test.mjs") -Raw
foreach ($symbol in @("selects the active advertised provider surface", "lowers provider surface trees into an Electron shell projection", "lowers Sai, Norn, and TeX sidecar plugin shells without owning semantics", "sai-vn-stage-shell", "norn-graph-shell", "tex-math-shell", "rejects surface documents that do not match the advertised target", "command intents carry provider-advertised boundaries", "aetheria.daemon.commands", "aetheria.eve_command_acceptance_status.v1")) {
  if (-not $testSource.Contains($symbol)) {
    throw "EveElectron provider shell test missing symbol: $symbol"
  }
}

Push-Location (Join-Path $projectRoot "runtimes\incubating\eve-electron")
try {
  npm test
  if ($LASTEXITCODE -ne 0) {
    throw "EveElectron provider shell tests failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "EveElectron provider shell smoke passed: $absoluteManifestPath"
