param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-tui\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveTui runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "tui") {
  throw "Unexpected EveTui runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveTui provider shell status: $($manifest.lifecycle.test.status)"
}

foreach ($feature in @("providerAdvertisements", "commandTransport", "terminalGridSummary", "terminalGridLowering", "pluginProjection")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveTui provider shell missing supported feature: $feature"
  }
}

foreach ($pluginId in @("sai.vn", "norn.graph", "tex.math")) {
  $supported = @($manifest.supportedPlugins) | Where-Object { $_.pluginId -eq $pluginId } | Select-Object -First 1
  if (-not $supported) {
    throw "EveTui provider shell missing supported plugin projection: $pluginId"
  }
}

$worldSurfaceLoweringClaims = @()
if ($null -ne $manifest.worldSurfaceLowering) {
  $worldSurfaceLoweringClaims = @($manifest.worldSurfaceLowering)
}
if ($worldSurfaceLoweringClaims.Count -ne 1) {
  throw "EveTui must claim exactly one provider world-surface lowering target"
}
$worldSurfaceLoweringClaim = $worldSurfaceLoweringClaims | Where-Object { $_.targetId -eq "tui" } | Select-Object -First 1
if (-not $worldSurfaceLoweringClaim) {
  throw "EveTui missing tui world-surface lowering claim"
}
foreach ($surfaceKind in @("interactive-world", "interactive-world-editor")) {
  if (-not (@($worldSurfaceLoweringClaim.surfaceKinds) -contains $surfaceKind)) {
    throw "EveTui world-surface claim missing surface kind: $surfaceKind"
  }
}
foreach ($projectionKind in @("provider-authored-world-surface", "provider-authored-world-editor-surface")) {
  if (-not (@($worldSurfaceLoweringClaim.projectionKinds) -contains $projectionKind)) {
    throw "EveTui world-surface claim missing projection kind: $projectionKind"
  }
}
if ($worldSurfaceLoweringClaim.supportLevel -ne "terminal-grid-command-surface") {
  throw "Unexpected EveTui support level: $($worldSurfaceLoweringClaim.supportLevel)"
}
if ($worldSurfaceLoweringClaim.ownership -ne "runtime-lowers-provider-world-surface-without-owning-world-state") {
  throw "Unexpected EveTui ownership: $($worldSurfaceLoweringClaim.ownership)"
}
foreach ($evidencePath in @($worldSurfaceLoweringClaim.evidencePaths)) {
  $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
  if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
    throw "EveTui world-surface claim missing evidence path: $evidencePath"
  }
}

$expectedFiles = @(
  "runtimes\incubating\eve-tui\package.json",
  "runtimes\incubating\eve-tui\src\eve-tui-shell.mjs",
  "runtimes\incubating\eve-tui\test\eve-tui-shell.test.mjs"
)

foreach ($relativePath in $expectedFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveTui provider shell missing file: $relativePath"
  }
}

$shellSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-tui\src\eve-tui-shell.mjs") -Raw
foreach ($symbol in @("EveTuiShell", "selectSurface", "lowerSurface", "normalizeSurfaceDocument", "buildComponentLines", "buildPluginProjection", "collectPluginProjections", "terminalElementKind", "sai.vn", "norn.graph", "tex.math", "sidecar-advertised-plugin-abi", "createCommandIntent", "renderSummary", "gamecult.eve.tui_grid.v1", "commandBoundary", "receiptSchema")) {
  if (-not $shellSource.Contains($symbol)) {
    throw "EveTui provider shell source missing symbol: $symbol"
  }
}

$testSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-tui\test\eve-tui-shell.test.mjs") -Raw
foreach ($symbol in @("selects advertised provider surfaces", "command intents carry provider-advertised boundaries", "summary grid is explicitly lossy", "lowers provider surface trees into a terminal grid", "lowers Sai, Norn, and TeX plugin surfaces into compact terminal fallbacks", "pluginProjections", "sai-vn-terminal-stage-summary", "norn-graph-terminal-outline", "tex-math-terminal-block-source", "rejects surface documents that do not match the advertised TUI target", "aetheria.daemon.commands")) {
  if (-not $testSource.Contains($symbol)) {
    throw "EveTui provider shell test missing symbol: $symbol"
  }
}

Push-Location (Join-Path $projectRoot "runtimes\incubating\eve-tui")
try {
  npm test
  if ($LASTEXITCODE -ne 0) {
    throw "EveTui provider shell tests failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "EveTui provider shell smoke passed: $absoluteManifestPath"
