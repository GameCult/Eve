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

foreach ($feature in @("providerAdvertisements", "commandTransport")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveElectron manifest missing provider-shell feature: $feature"
  }
}
if (@($manifest.supportedPlugins).Count -ne 0) {
  throw "EveElectron must not claim plugin projection before the generic shell body exists"
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
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveElectron release contract missing $field"
  }
}
foreach ($pathProperty in @("packageRoot", "versionSource")) {
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
foreach ($field in @("ownerRepo", "runtimeId", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveElectron capture contract missing $field"
  }
}

& (Join-Path $projectRoot "scripts\run-eveelectron-split-handoff-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveelectron-provider-shell-smoke.ps1")

Write-Host "EveElectron lifecycle smoke passed: $absoluteManifestPath"
