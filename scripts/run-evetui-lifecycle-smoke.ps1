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

if ($manifest.schema -ne "gamecult.eve.runtime_capability.v1") {
  throw "Unexpected EveTui manifest schema: $($manifest.schema)"
}
if ($manifest.runtimeId -ne "tui") {
  throw "Unexpected EveTui runtime id: $($manifest.runtimeId)"
}
if ($manifest.owner -ne "EveTui") {
  throw "Unexpected EveTui owner: $($manifest.owner)"
}
if ($manifest.incubation.ownerRepo -ne "EveTui") {
  throw "Unexpected EveTui incubation owner: $($manifest.incubation.ownerRepo)"
}
if ($manifest.incubation.currentHostRepo -ne "Eve") {
  throw "Unexpected EveTui current host repo: $($manifest.incubation.currentHostRepo)"
}
if ($manifest.incubation.splitTarget -ne "EveTui") {
  throw "Unexpected EveTui split target: $($manifest.incubation.splitTarget)"
}

foreach ($feature in @("providerAdvertisements", "commandTransport", "terminalGridSummary", "terminalGridLowering")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveTui manifest missing provider-shell feature: $feature"
  }
}
if (@($manifest.supportedPlugins).Count -ne 0) {
  throw "EveTui must not claim plugin projection before terminal projection adapters for sidecar-advertised capabilities exist"
}

$worldSurfaceLoweringClaims = @()
if ($null -ne $manifest.worldSurfaceLowering) {
  $worldSurfaceLoweringClaims = @($manifest.worldSurfaceLowering)
}
if ($worldSurfaceLoweringClaims.Count -ne 1) {
  throw "EveTui must claim exactly one world-surface lowering target"
}
$worldSurfaceLoweringClaim = $worldSurfaceLoweringClaims | Where-Object { $_.targetId -eq "tui" } | Select-Object -First 1
if (-not $worldSurfaceLoweringClaim) {
  throw "EveTui manifest missing tui world-surface lowering claim"
}
if ($worldSurfaceLoweringClaim.supportLevel -ne "terminal-grid-command-surface") {
  throw "Unexpected EveTui world-surface support level: $($worldSurfaceLoweringClaim.supportLevel)"
}
if ($worldSurfaceLoweringClaim.ownership -ne "runtime-lowers-provider-world-surface-without-owning-world-state") {
  throw "Unexpected EveTui world-surface ownership: $($worldSurfaceLoweringClaim.ownership)"
}
foreach ($evidencePath in @($worldSurfaceLoweringClaim.evidencePaths)) {
  $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
  if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
    throw "EveTui world-surface claim missing evidence path: $evidencePath"
  }
}

foreach ($pluginId in @("sai.vn", "norn.graph", "tex.math")) {
  $unsupported = @($manifest.unsupportedPlugins) | Where-Object { $_.pluginId -eq $pluginId } | Select-Object -First 1
  if (-not $unsupported) {
    throw "EveTui manifest missing unsupported plugin declaration: $pluginId"
  }
}

if ($manifest.commandTransport.schema -ne "gamecult.eve.command.v1") {
  throw "Unexpected EveTui command schema: $($manifest.commandTransport.schema)"
}
if ($manifest.commandTransport.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveTui command transport status: $($manifest.commandTransport.status)"
}

foreach ($stage in @("release", "test", "capture")) {
  $stageDocument = $manifest.lifecycle.$stage
  if ($null -eq $stageDocument) {
    throw "EveTui lifecycle missing stage: $stage"
  }
  if ($stageDocument.ownerRepo -ne "EveTui") {
    throw "EveTui lifecycle stage $stage has unexpected owner: $($stageDocument.ownerRepo)"
  }
  if (-not $stageDocument.status) {
    throw "EveTui lifecycle stage $stage missing status"
  }
  foreach ($evidencePath in @($stageDocument.evidencePaths)) {
    $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
    if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
      throw "EveTui lifecycle stage $stage missing evidence path: $evidencePath"
    }
  }
}

$releaseContract = $manifest.lifecycle.release.releaseContract
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveTui release contract missing $field"
  }
}
foreach ($pathProperty in @("packageRoot", "versionSource")) {
  $relativePath = $releaseContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveTui release contract $pathProperty does not exist: $relativePath"
  }
}

$testContract = $manifest.lifecycle.test.testContract
foreach ($field in @("ownerRepo", "runnerKind", "runnerScript", "consumerProject", "packageName", "testAssembly", "testPlatform", "resultsArtifact", "logArtifact", "manifestMutation")) {
  if (-not $testContract.$field) {
    throw "EveTui test contract missing $field"
  }
}
foreach ($pathProperty in @("runnerScript", "consumerProject")) {
  $candidate = $testContract.$pathProperty
  $absolutePath = if ([System.IO.Path]::IsPathRooted($candidate)) {
    $candidate
  } else {
    Join-Path $projectRoot $candidate
  }
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveTui test contract $pathProperty does not exist: $candidate"
  }
}

$captureContract = $manifest.lifecycle.capture.captureContract
foreach ($field in @("ownerRepo", "runtimeId", "targetId", "requestSchema", "requestBuilder", "advertisementPath", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveTui capture contract missing $field"
  }
}
if ($captureContract.runtimeId -ne "tui") {
  throw "EveTui capture contract has unexpected runtime: $($captureContract.runtimeId)"
}
if ($captureContract.targetId -ne "tui") {
  throw "EveTui capture contract has unexpected target: $($captureContract.targetId)"
}
if ($captureContract.requestSchema -ne "gamecult.eve.runtime_capture_request.v1") {
  throw "EveTui capture contract has unexpected request schema: $($captureContract.requestSchema)"
}
if ($captureContract.captureKind -ne "terminal-transcript-or-cell-grid") {
  throw "EveTui capture contract has unexpected capture kind: $($captureContract.captureKind)"
}
foreach ($pathProperty in @("requestBuilder", "advertisementPath")) {
  $relativePath = $captureContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveTui capture contract $pathProperty does not exist: $relativePath"
  }
}

& (Join-Path $projectRoot "scripts\run-evetui-split-handoff-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-evetui-provider-shell-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-evetui-capture-contract-smoke.ps1")

Write-Host "EveTui lifecycle smoke passed: $absoluteManifestPath"
