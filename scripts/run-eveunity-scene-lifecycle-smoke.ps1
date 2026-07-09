param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-unity-scene\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveUnity scene runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.schema -ne "gamecult.eve.runtime_capability.v1") {
  throw "Unexpected EveUnity scene manifest schema: $($manifest.schema)"
}
if ($manifest.runtimeId -ne "unity-scene") {
  throw "Unexpected EveUnity scene runtime id: $($manifest.runtimeId)"
}
if ($manifest.owner -ne "EveUnity") {
  throw "Unexpected EveUnity scene owner: $($manifest.owner)"
}
if ($manifest.incubation.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity scene incubation owner: $($manifest.incubation.ownerRepo)"
}
if ($manifest.incubation.currentHostRepo -ne "Eve") {
  throw "Unexpected EveUnity scene current host repo: $($manifest.incubation.currentHostRepo)"
}
if ($manifest.incubation.splitTarget -ne "EveUnity") {
  throw "Unexpected EveUnity scene split target: $($manifest.incubation.splitTarget)"
}
if ($manifest.incubation.splitHandoff.manifestPath -ne "runtimes/incubating/eve-unity-scene/eveunity-scene-split-handoff.json") {
  throw "EveUnity scene manifest missing split handoff path"
}

if (@($manifest.supportedFeatures).Count -ne 0) {
  throw "EveUnity scene must not claim supported runtime features before the generic scene lowerer exists"
}
if (@($manifest.supportedPlugins).Count -ne 0) {
  throw "EveUnity scene must not claim plugin projection before the generic scene lowerer exists"
}
$worldSurfaceLoweringClaims = if ($null -eq $manifest.worldSurfaceLowering) { @() } else { @($manifest.worldSurfaceLowering) }
if ($worldSurfaceLoweringClaims.Count -ne 0) {
  throw "EveUnity scene must not claim world-surface lowering before real scene projection evidence exists"
}

foreach ($pluginId in @("sai.vn", "norn.graph", "tex.math")) {
  $unsupported = @($manifest.unsupportedPlugins) | Where-Object { $_.pluginId -eq $pluginId } | Select-Object -First 1
  if (-not $unsupported) {
    throw "EveUnity scene manifest missing unsupported plugin declaration: $pluginId"
  }
}

if ($manifest.commandTransport.schema -ne "gamecult.eve.command.v1") {
  throw "Unexpected EveUnity scene command schema: $($manifest.commandTransport.schema)"
}
if ($manifest.commandTransport.status -ne "pending-runtime-body") {
  throw "Unexpected EveUnity scene command transport status: $($manifest.commandTransport.status)"
}

foreach ($stage in @("release", "test", "capture")) {
  $stageDocument = $manifest.lifecycle.$stage
  if ($null -eq $stageDocument) {
    throw "EveUnity scene lifecycle missing stage: $stage"
  }
  if ($stageDocument.ownerRepo -ne "EveUnity") {
    throw "EveUnity scene lifecycle stage $stage has unexpected owner: $($stageDocument.ownerRepo)"
  }
  if (-not $stageDocument.status) {
    throw "EveUnity scene lifecycle stage $stage missing status"
  }
  foreach ($evidencePath in @($stageDocument.evidencePaths)) {
    $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
    if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
      throw "EveUnity scene lifecycle stage $stage missing evidence path: $evidencePath"
    }
  }
}

$releaseContract = $manifest.lifecycle.release.releaseContract
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveUnity scene release contract missing $field"
  }
}
foreach ($pathProperty in @("packageRoot", "versionSource")) {
  $relativePath = $releaseContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity scene release contract $pathProperty does not exist: $relativePath"
  }
}

$testContract = $manifest.lifecycle.test.testContract
foreach ($field in @("ownerRepo", "runnerKind", "runnerScript", "consumerProject", "packageName", "testAssembly", "testPlatform", "resultsArtifact", "logArtifact", "manifestMutation")) {
  if (-not $testContract.$field) {
    throw "EveUnity scene test contract missing $field"
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
    throw "EveUnity scene test contract $pathProperty does not exist: $candidate"
  }
}

$captureContract = $manifest.lifecycle.capture.captureContract
foreach ($field in @("ownerRepo", "runtimeId", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveUnity scene capture contract missing $field"
  }
}
if ($captureContract.runtimeId -ne "unity-scene") {
  throw "EveUnity scene capture contract has unexpected runtime: $($captureContract.runtimeId)"
}

& (Join-Path $projectRoot "scripts\run-eveunity-scene-split-handoff-smoke.ps1")

Write-Host "EveUnity scene lifecycle smoke passed: $absoluteManifestPath"
