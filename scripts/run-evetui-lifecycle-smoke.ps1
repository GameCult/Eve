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

if (@($manifest.supportedFeatures).Count -ne 0) {
  throw "EveTui must not claim supported runtime features before the generic TUI lowerer exists"
}
if (@($manifest.supportedPlugins).Count -ne 0) {
  throw "EveTui must not claim plugin projection before the generic TUI lowerer exists"
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
if ($manifest.commandTransport.status -ne "pending-runtime-body") {
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
foreach ($field in @("ownerRepo", "runtimeId", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveTui capture contract missing $field"
  }
}

& (Join-Path $projectRoot "scripts\run-evetui-split-handoff-smoke.ps1")

Write-Host "EveTui lifecycle smoke passed: $absoluteManifestPath"
