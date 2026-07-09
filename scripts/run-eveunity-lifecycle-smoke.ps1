param(
  [string] $CapabilityManifestPath = "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json",
  [switch] $RunUnityEditMode
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveUnity runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.schema -ne "gamecult.eve.runtime_capability.v1") {
  throw "Unexpected EveUnity manifest schema: $($manifest.schema)"
}
if ($manifest.runtimeId -ne "unity-uitoolkit") {
  throw "Unexpected EveUnity runtime id: $($manifest.runtimeId)"
}
if ($manifest.owner -ne "EveUnity") {
  throw "Unexpected EveUnity owner: $($manifest.owner)"
}
if ($manifest.incubation.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity incubation owner: $($manifest.incubation.ownerRepo)"
}
if ($manifest.incubation.currentHostRepo -ne "Eve") {
  throw "Unexpected EveUnity current host repo: $($manifest.incubation.currentHostRepo)"
}
if ($manifest.incubation.splitTarget -ne "EveUnity") {
  throw "Unexpected EveUnity split target: $($manifest.incubation.splitTarget)"
}
if (-not $manifest.incubation.splitHandoff.manifestPath) {
  throw "EveUnity manifest missing split handoff path"
}

foreach ($feature in @("embeddedDocuments")) {
  if (-not ($manifest.supportedFeatures -contains $feature)) {
    throw "EveUnity manifest missing supported feature: $feature"
  }
}

$pluginClaims = @{}
foreach ($plugin in $manifest.supportedPlugins) {
  $pluginClaims[$plugin.pluginId] = @($plugin.capabilities)
}
foreach ($claim in @(
  @{ pluginId = "sai.vn"; capabilities = @("vn.stage", "story.choose", "story.continue", "story.jump") },
  @{ pluginId = "norn.graph"; capabilities = @("embed.norn") }
)) {
  if (-not $pluginClaims.ContainsKey($claim.pluginId)) {
    throw "EveUnity manifest missing plugin claim: $($claim.pluginId)"
  }
  foreach ($capability in $claim.capabilities) {
    if (-not ($pluginClaims[$claim.pluginId] -contains $capability)) {
      throw "EveUnity manifest missing plugin capability: $($claim.pluginId):$capability"
    }
  }
}

if ($manifest.commandTransport.schema -ne "gamecult.eve.command.v1") {
  throw "Unexpected EveUnity command schema: $($manifest.commandTransport.schema)"
}

foreach ($stage in @("release", "test", "capture")) {
  $stageDocument = $manifest.lifecycle.$stage
  if ($null -eq $stageDocument) {
    throw "EveUnity lifecycle missing stage: $stage"
  }
  if ($stageDocument.ownerRepo -ne "EveUnity") {
    throw "EveUnity lifecycle stage $stage has unexpected owner: $($stageDocument.ownerRepo)"
  }
  if (-not $stageDocument.status) {
    throw "EveUnity lifecycle stage $stage missing status"
  }
  foreach ($evidencePath in $stageDocument.evidencePaths) {
    $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
    if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
      throw "EveUnity lifecycle stage $stage missing evidence path: $evidencePath"
    }
  }
}

$releaseContract = $manifest.lifecycle.release.releaseContract
if ($null -eq $releaseContract) {
  throw "EveUnity release lifecycle missing releaseContract"
}
if ($releaseContract.ownerRepo -ne "EveUnity") {
  throw "EveUnity release contract has unexpected owner: $($releaseContract.ownerRepo)"
}
if ($releaseContract.packageName -ne "org.gamecult.eve.unity-uitoolkit") {
  throw "EveUnity release contract has unexpected package name: $($releaseContract.packageName)"
}
if ($releaseContract.artifactKind -ne "upm-package") {
  throw "EveUnity release contract has unexpected artifact kind: $($releaseContract.artifactKind)"
}
if ($releaseContract.requestSchema -ne "gamecult.eve.runtime_release_request.v1") {
  throw "EveUnity release contract has unexpected request schema: $($releaseContract.requestSchema)"
}
if (-not ($releaseContract.tagPattern -match "\{version\}")) {
  throw "EveUnity release contract tag pattern must include {version}: $($releaseContract.tagPattern)"
}
if (-not ($releaseContract.artifactPattern -match "\{version\}")) {
  throw "EveUnity release contract artifact pattern must include {version}: $($releaseContract.artifactPattern)"
}
foreach ($pathProperty in @("packageRoot", "versionSource", "requestBuilder")) {
  $relativePath = $releaseContract.$pathProperty
  if (-not $relativePath) {
    throw "EveUnity release contract missing $pathProperty"
  }
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity release contract $pathProperty does not exist: $relativePath"
  }
}
$packageManifest = Get-Content -LiteralPath (Join-Path $projectRoot $releaseContract.versionSource) -Raw | ConvertFrom-Json
if ($packageManifest.name -ne $releaseContract.packageName) {
  throw "EveUnity release contract package name does not match package manifest: $($releaseContract.packageName) vs $($packageManifest.name)"
}
if (-not $packageManifest.version) {
  throw "EveUnity release contract package manifest missing version"
}
if ($packageManifest.dependencies."org.gamecult.eve.surface" -ne "0.1.0") {
  throw "EveUnity package manifest missing org.gamecult.eve.surface dependency"
}

& (Join-Path $projectRoot "scripts\run-eveunity-release-contract-smoke.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity release contract smoke failed with exit code $LASTEXITCODE"
}

$testContract = $manifest.lifecycle.test.testContract
if ($null -eq $testContract) {
  throw "EveUnity test lifecycle missing testContract"
}
if ($testContract.ownerRepo -ne "EveUnity") {
  throw "EveUnity test contract has unexpected owner: $($testContract.ownerRepo)"
}
if ($testContract.runnerKind -ne "unity-editmode-batchmode") {
  throw "EveUnity test contract has unexpected runner kind: $($testContract.runnerKind)"
}
if ($testContract.packageName -ne "org.gamecult.eve.unity-uitoolkit") {
  throw "EveUnity test contract has unexpected package name: $($testContract.packageName)"
}
if ($testContract.testAssembly -ne "GameCult.Eve.UnityUIToolkit.Tests") {
  throw "EveUnity test contract has unexpected test assembly: $($testContract.testAssembly)"
}
if ($testContract.testPlatform -ne "EditMode") {
  throw "EveUnity test contract has unexpected test platform: $($testContract.testPlatform)"
}
foreach ($pathProperty in @("runnerScript", "consumerProject")) {
  $candidate = $testContract.$pathProperty
  if (-not $candidate) {
    throw "EveUnity test contract missing $pathProperty"
  }
  $absolutePath = if ([System.IO.Path]::IsPathRooted($candidate)) {
    $candidate
  } else {
    Join-Path $projectRoot $candidate
  }
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity test contract $pathProperty does not exist: $candidate"
  }
}
$runnerSource = Get-Content -LiteralPath (Join-Path $projectRoot $testContract.runnerScript) -Raw
foreach ($expectedText in @($testContract.packageName, $testContract.testAssembly, $testContract.testPlatform, "testables", "Restore-Manifest")) {
  if (-not $runnerSource.Contains($expectedText)) {
    throw "EveUnity test contract runner script missing expected text: $expectedText"
  }
}

$captureContract = $manifest.lifecycle.capture.captureContract
if ($null -eq $captureContract) {
  throw "EveUnity capture lifecycle missing captureContract"
}
if ($captureContract.ownerRepo -ne "EveUnity") {
  throw "EveUnity capture contract has unexpected owner: $($captureContract.ownerRepo)"
}
if ($captureContract.runtimeId -ne "unity-uitoolkit") {
  throw "EveUnity capture contract has unexpected runtime: $($captureContract.runtimeId)"
}
if ($captureContract.targetId -ne "unity-uitoolkit") {
  throw "EveUnity capture contract has unexpected target: $($captureContract.targetId)"
}
if ($captureContract.requestSchema -ne "gamecult.eve.runtime_capture_request.v1") {
  throw "EveUnity capture contract has unexpected request schema: $($captureContract.requestSchema)"
}
if ($captureContract.captureKind -ne "unity-editor-or-batchmode-png") {
  throw "EveUnity capture contract has unexpected capture kind: $($captureContract.captureKind)"
}
if ($captureContract.artifactKind -ne "png") {
  throw "EveUnity capture contract has unexpected artifact kind: $($captureContract.artifactKind)"
}
foreach ($field in @("requestBuilder", "advertisementPath", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveUnity capture contract missing $field"
  }
}
foreach ($pathProperty in @("requestBuilder", "advertisementPath")) {
  $relativePath = $captureContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity capture contract $pathProperty does not exist: $relativePath"
  }
}

& (Join-Path $projectRoot "scripts\run-eveunity-capture-contract-smoke.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity capture contract smoke failed with exit code $LASTEXITCODE"
}

& (Join-Path $projectRoot "scripts\run-aetheria-unity-package-smoke.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Aetheria Unity package smoke failed with exit code $LASTEXITCODE"
}

& (Join-Path $projectRoot "scripts\run-eveunity-split-handoff-smoke.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity split handoff smoke failed with exit code $LASTEXITCODE"
}

if ($RunUnityEditMode) {
  & (Join-Path $projectRoot "scripts\run-aetheria-unity-editmode-tests.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Aetheria Unity EditMode smoke failed with exit code $LASTEXITCODE"
  }
}

Write-Host "EveUnity lifecycle smoke passed: $absoluteManifestPath"
