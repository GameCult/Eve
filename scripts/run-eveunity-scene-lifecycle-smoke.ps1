param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-unity-scene\eve-runtime-capability.json",
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

foreach ($feature in @("providerAdvertisements", "commandTransport", "providerSurfaceSession", "providerSurfaceSource", "providerSurfaceDocumentSource", "livePlayableWorldClient", "providerCommandReceipts", "providerAssetManifestDocumentSource", "playableWorldClientHost", "playableWorldClientBootstrap", "playableWorldInputDriver", "playableWorldCameraRig", "sceneGraphProjection", "playableWorldProjection", "playableWorldRuntimeHost", "playableWorldScenePresentation", "unityGameObjectSceneSink", "providerAssetManifestResolution", "providerAssetManifestSource", "embeddedDocuments")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveUnity scene manifest missing provider-shell feature: $feature"
  }
}
if (@($manifest.supportedPlugins).Count -ne 3) {
  throw "EveUnity scene must claim exactly three plugin projection adapters"
}
$saiProjection = @($manifest.supportedPlugins) | Where-Object { $_.pluginId -eq "sai.vn" } | Select-Object -First 1
if (-not $saiProjection) {
  throw "EveUnity scene manifest missing supported Sai projection adapter"
}
if ($saiProjection.projectionAdapter -ne "SaiVisualNovelUnitySceneProjectionAdapter") {
  throw "Unexpected EveUnity scene Sai projection adapter: $($saiProjection.projectionAdapter)"
}
foreach ($capability in @("vn.stage", "story.choose", "story.continue", "story.jump")) {
  if (-not (@($saiProjection.capabilities) -contains $capability)) {
    throw "EveUnity scene Sai projection adapter must claim $capability"
  }
}
$nornProjection = @($manifest.supportedPlugins) | Where-Object { $_.pluginId -eq "norn.graph" } | Select-Object -First 1
if (-not $nornProjection) {
  throw "EveUnity scene manifest missing supported Norn projection adapter"
}
if ($nornProjection.projectionAdapter -ne "NornGraphUnitySceneProjectionAdapter") {
  throw "Unexpected EveUnity scene Norn projection adapter: $($nornProjection.projectionAdapter)"
}
if (-not (@($nornProjection.capabilities) -contains "embed.norn")) {
  throw "EveUnity scene Norn projection adapter must claim embed.norn"
}
$texProjection = @($manifest.supportedPlugins) | Where-Object { $_.pluginId -eq "tex.math" } | Select-Object -First 1
if (-not $texProjection) {
  throw "EveUnity scene manifest missing supported TeX projection adapter"
}
if ($texProjection.projectionAdapter -ne "TeXMathUnitySceneProjectionAdapter") {
  throw "Unexpected EveUnity scene TeX projection adapter: $($texProjection.projectionAdapter)"
}
foreach ($capability in @("embed.tex", "tex.inline", "tex.block", "tex.scene-placement")) {
  if (-not (@($texProjection.capabilities) -contains $capability)) {
    throw "EveUnity scene TeX projection adapter must claim $capability"
  }
}
$worldSurfaceLoweringClaims = @()
if ($null -ne $manifest.worldSurfaceLowering) {
  $worldSurfaceLoweringClaims = @($manifest.worldSurfaceLowering)
}
if ($worldSurfaceLoweringClaims.Count -ne 1) {
  throw "EveUnity scene must claim exactly one world-surface lowering target"
}
$worldSurfaceLoweringClaim = $worldSurfaceLoweringClaims | Where-Object { $_.targetId -eq "unity-scene" } | Select-Object -First 1
if (-not $worldSurfaceLoweringClaim) {
  throw "EveUnity scene manifest missing unity-scene world-surface lowering claim"
}
if ($worldSurfaceLoweringClaim.supportLevel -ne "unity-playable-world-scene-command-surface") {
  throw "Unexpected EveUnity scene world-surface support level: $($worldSurfaceLoweringClaim.supportLevel)"
}
if ($worldSurfaceLoweringClaim.ownership -ne "runtime-lowers-provider-world-surface-without-owning-world-state") {
  throw "Unexpected EveUnity scene world-surface ownership: $($worldSurfaceLoweringClaim.ownership)"
}
foreach ($evidencePath in @($worldSurfaceLoweringClaim.evidencePaths)) {
  $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
  if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
    throw "EveUnity scene world-surface claim missing evidence path: $evidencePath"
  }
}

if (@($manifest.unsupportedPlugins) | Where-Object { $_.pluginId -eq "sai.vn" } | Select-Object -First 1) {
  throw "EveUnity scene must not report sai.vn unsupported while the projection adapter is declared"
}
if (@($manifest.unsupportedPlugins) | Where-Object { $_.pluginId -eq "norn.graph" } | Select-Object -First 1) {
  throw "EveUnity scene must not report norn.graph unsupported while the projection adapter is declared"
}
if (@($manifest.unsupportedPlugins) | Where-Object { $_.pluginId -eq "tex.math" } | Select-Object -First 1) {
  throw "EveUnity scene must not report tex.math unsupported while the projection adapter is declared"
}

if ($manifest.commandTransport.schema -ne "gamecult.eve.command.v1") {
  throw "Unexpected EveUnity scene command schema: $($manifest.commandTransport.schema)"
}
if ($manifest.commandTransport.status -ne "provider-shell-contract-skeleton") {
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
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "requestSchema", "requestBuilder", "artifactBuilder", "artifactPattern", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveUnity scene release contract missing $field"
  }
}
if ($releaseContract.requestSchema -ne "gamecult.eve.runtime_release_request.v1") {
  throw "EveUnity scene release contract has unexpected request schema: $($releaseContract.requestSchema)"
}
foreach ($pathProperty in @("packageRoot", "versionSource")) {
  $relativePath = $releaseContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity scene release contract $pathProperty does not exist: $relativePath"
  }
}
foreach ($pathProperty in @("requestBuilder", "artifactBuilder")) {
  $relativePath = $releaseContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity scene release contract $pathProperty does not exist: $relativePath"
  }
}
$packageManifest = Get-Content -LiteralPath (Join-Path $projectRoot $releaseContract.versionSource) -Raw | ConvertFrom-Json
$surfaceDependency = @($releaseContract.requiredPackageDependencies) | Where-Object { $_.packageName -eq "org.gamecult.eve.surface" } | Select-Object -First 1
if (-not $surfaceDependency) {
  throw "EveUnity scene release contract missing required org.gamecult.eve.surface dependency contract"
}
if ($surfaceDependency.ownerRepo -ne "Eve" -or $surfaceDependency.packageManager -ne "upm") {
  throw "EveUnity scene release contract has unexpected surface dependency owner/package manager: $($surfaceDependency.ownerRepo)/$($surfaceDependency.packageManager)"
}
if ($surfaceDependency.version -ne $packageManifest.dependencies."org.gamecult.eve.surface") {
  throw "EveUnity scene release contract surface dependency version mismatch: $($surfaceDependency.version)"
}

$testContract = $manifest.lifecycle.test.testContract
foreach ($field in @("ownerRepo", "runnerKind", "runnerScript", "consumerProject", "packageName", "testAssembly", "testPlatform", "resultsArtifact", "logArtifact", "manifestMutation")) {
  if (-not $testContract.$field) {
    throw "EveUnity scene test contract missing $field"
  }
}
if ($testContract.runnerKind -ne "unity-editmode-batchmode") {
  throw "EveUnity scene test contract has unexpected runner kind: $($testContract.runnerKind)"
}
if ($testContract.packageName -ne "org.gamecult.eve.unity-scene") {
  throw "EveUnity scene test contract has unexpected package name: $($testContract.packageName)"
}
if ($testContract.testAssembly -ne "GameCult.Eve.UnityScene.Tests") {
  throw "EveUnity scene test contract has unexpected test assembly: $($testContract.testAssembly)"
}
if ($testContract.testPlatform -ne "EditMode") {
  throw "EveUnity scene test contract has unexpected test platform: $($testContract.testPlatform)"
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
$runnerSource = Get-Content -LiteralPath (Join-Path $projectRoot $testContract.runnerScript) -Raw
foreach ($expectedText in @($testContract.packageName, $testContract.testAssembly, "run-aetheria-unity-editmode-tests.ps1")) {
  if (-not $runnerSource.Contains($expectedText)) {
    throw "EveUnity scene test runner script missing expected text: $expectedText"
  }
}

$captureContract = $manifest.lifecycle.capture.captureContract
foreach ($field in @("ownerRepo", "runtimeId", "targetId", "requestSchema", "requestBuilder", "advertisementPath", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveUnity scene capture contract missing $field"
  }
}
if ($captureContract.runtimeId -ne "unity-scene") {
  throw "EveUnity scene capture contract has unexpected runtime: $($captureContract.runtimeId)"
}
if ($captureContract.targetId -ne "unity-scene") {
  throw "EveUnity scene capture contract has unexpected target: $($captureContract.targetId)"
}
if ($captureContract.requestSchema -ne "gamecult.eve.runtime_capture_request.v1") {
  throw "EveUnity scene capture contract has unexpected request schema: $($captureContract.requestSchema)"
}
if ($captureContract.captureKind -ne "unity-scene-frame-png") {
  throw "EveUnity scene capture contract has unexpected capture kind: $($captureContract.captureKind)"
}
foreach ($pathProperty in @("requestBuilder", "advertisementPath")) {
  $relativePath = $captureContract.$pathProperty
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity scene capture contract $pathProperty does not exist: $relativePath"
  }
}

& (Join-Path $projectRoot "scripts\run-eveunity-scene-split-handoff-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveunity-scene-provider-shell-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveunity-scene-release-contract-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveunity-scene-release-artifact-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveunity-scene-capture-contract-smoke.ps1")
& (Join-Path $projectRoot "scripts\run-eveunity-scene-capture-smoke.ps1")

if ($RunUnityEditMode) {
  & (Join-Path $projectRoot "scripts\run-aetheria-unity-scene-editmode-tests.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Aetheria Unity scene EditMode smoke failed with exit code $LASTEXITCODE"
  }
}

Write-Host "EveUnity scene lifecycle smoke passed: $absoluteManifestPath"
