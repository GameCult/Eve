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

if ($manifest.schema -ne "gamecult.eve.runtime_capability.v1") {
  throw "Unexpected EveElectron manifest schema: $($manifest.schema)"
}
if ($manifest.runtimeId -ne "electron-shell") {
  throw "Unexpected EveElectron runtime id: $($manifest.runtimeId)"
}
if ($manifest.owner -ne "EveElectron") {
  throw "Unexpected EveElectron owner: $($manifest.owner)"
}
if ($manifest.incubation.ownerRepo -ne "EveElectron") {
  throw "Unexpected EveElectron incubation owner: $($manifest.incubation.ownerRepo)"
}
if ($manifest.incubation.currentHostRepo -ne "Eve") {
  throw "Unexpected EveElectron current host repo: $($manifest.incubation.currentHostRepo)"
}
if ($manifest.incubation.splitTarget -ne "EveElectron") {
  throw "Unexpected EveElectron split target: $($manifest.incubation.splitTarget)"
}
if (-not $manifest.incubation.splitHandoff.manifestPath) {
  throw "EveElectron manifest missing split handoff path"
}

foreach ($feature in @("providerAdvertisements", "commandTransport", "surfaceTreeProjection")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveElectron manifest missing provider-shell feature: $feature"
  }
}
if (@($manifest.supportedPlugins).Count -ne 0) {
  throw "EveElectron must not claim plugin projection before runtime projection adapters for sidecar-advertised capabilities exist"
}

$worldSurfaceLoweringClaims = @()
if ($null -ne $manifest.worldSurfaceLowering) {
  $worldSurfaceLoweringClaims = @($manifest.worldSurfaceLowering)
}
if ($worldSurfaceLoweringClaims.Count -ne 1) {
  throw "EveElectron must claim exactly one world-surface lowering target"
}
$worldSurfaceLoweringClaim = $worldSurfaceLoweringClaims | Where-Object { $_.targetId -eq "electron-shell" } | Select-Object -First 1
if (-not $worldSurfaceLoweringClaim) {
  throw "EveElectron manifest missing electron-shell world-surface lowering claim"
}
if ($worldSurfaceLoweringClaim.supportLevel -ne "electron-shell-surface-tree-command-surface") {
  throw "Unexpected EveElectron world-surface support level: $($worldSurfaceLoweringClaim.supportLevel)"
}
if ($worldSurfaceLoweringClaim.ownership -ne "runtime-lowers-provider-world-surface-without-owning-world-state") {
  throw "Unexpected EveElectron world-surface ownership: $($worldSurfaceLoweringClaim.ownership)"
}
foreach ($evidencePath in @($worldSurfaceLoweringClaim.evidencePaths)) {
  $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
  if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
    throw "EveElectron world-surface claim missing evidence path: $evidencePath"
  }
}

foreach ($pluginId in @("sai.vn", "norn.graph", "tex.math")) {
  $unsupported = @($manifest.unsupportedPlugins) | Where-Object { $_.pluginId -eq $pluginId } | Select-Object -First 1
  if (-not $unsupported) {
    throw "EveElectron manifest missing unsupported plugin declaration: $pluginId"
  }
}

if ($manifest.commandTransport.schema -ne "gamecult.eve.command.v1") {
  throw "Unexpected EveElectron command schema: $($manifest.commandTransport.schema)"
}
if ($manifest.commandTransport.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveElectron command transport status: $($manifest.commandTransport.status)"
}

foreach ($stage in @("release", "test", "capture")) {
  $stageDocument = $manifest.lifecycle.$stage
  if ($null -eq $stageDocument) {
    throw "EveElectron lifecycle missing stage: $stage"
  }
  if ($stageDocument.ownerRepo -ne "EveElectron") {
    throw "EveElectron lifecycle stage $stage has unexpected owner: $($stageDocument.ownerRepo)"
  }
  if (-not $stageDocument.status) {
    throw "EveElectron lifecycle stage $stage missing status"
  }
  foreach ($evidencePath in @($stageDocument.evidencePaths)) {
    $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
    if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
      throw "EveElectron lifecycle stage $stage missing evidence path: $evidencePath"
    }
  }
}

$releaseContract = $manifest.lifecycle.release.releaseContract
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "requestSchema", "requestBuilder", "artifactPattern", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveElectron release contract missing $field"
  }
}
if ($releaseContract.requestSchema -ne "gamecult.eve.runtime_release_request.v1") {
  throw "EveElectron release contract has unexpected request schema: $($releaseContract.requestSchema)"
}
foreach ($pathProperty in @("packageRoot", "versionSource")) {
  $relativePath = $releaseContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveElectron release contract $pathProperty does not exist: $relativePath"
  }
}
foreach ($pathProperty in @("requestBuilder")) {
  $relativePath = $releaseContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveElectron release contract $pathProperty does not exist: $relativePath"
  }
}

$testContract = $manifest.lifecycle.test.testContract
foreach ($field in @("ownerRepo", "runnerKind", "runnerScript", "consumerProject", "packageName", "testAssembly", "testPlatform", "resultsArtifact", "logArtifact", "manifestMutation")) {
  if (-not $testContract.$field) {
    throw "EveElectron test contract missing $field"
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
    throw "EveElectron test contract $pathProperty does not exist: $candidate"
  }
}

$captureContract = $manifest.lifecycle.capture.captureContract
foreach ($field in @("ownerRepo", "runtimeId", "targetId", "requestSchema", "requestBuilder", "advertisementPath", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveElectron capture contract missing $field"
  }
}
if ($captureContract.runtimeId -ne "electron-shell") {
  throw "EveElectron capture contract has unexpected runtime: $($captureContract.runtimeId)"
}
if ($captureContract.targetId -ne "electron-shell") {
  throw "EveElectron capture contract has unexpected target: $($captureContract.targetId)"
}
if ($captureContract.requestSchema -ne "gamecult.eve.runtime_capture_request.v1") {
  throw "EveElectron capture contract has unexpected request schema: $($captureContract.requestSchema)"
}
if ($captureContract.captureKind -ne "electron-window-png") {
  throw "EveElectron capture contract has unexpected capture kind: $($captureContract.captureKind)"
}
foreach ($pathProperty in @("requestBuilder", "advertisementPath")) {
  $relativePath = $captureContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveElectron capture contract $pathProperty does not exist: $relativePath"
  }
}

& (Join-Path $projectRoot "scripts\run-eveelectron-split-handoff-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveelectron-release-contract-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveelectron-provider-shell-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveelectron-capture-contract-smoke.ps1")

Write-Host "EveElectron lifecycle smoke passed: $absoluteManifestPath"
