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

if ($manifest.runtimeId -ne "unity-scene") {
  throw "Unexpected EveUnity scene runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveUnity scene provider shell status: $($manifest.lifecycle.test.status)"
}

$worldSurfaceLoweringClaims = @()
if ($null -ne $manifest.worldSurfaceLowering) {
  $worldSurfaceLoweringClaims = @($manifest.worldSurfaceLowering)
}
if ($worldSurfaceLoweringClaims.Count -ne 1) {
  throw "EveUnity scene must claim exactly one provider world-surface lowering target"
}
$worldSurfaceLoweringClaim = $worldSurfaceLoweringClaims | Where-Object { $_.targetId -eq "unity-scene" } | Select-Object -First 1
if (-not $worldSurfaceLoweringClaim) {
  throw "EveUnity scene missing unity-scene world-surface lowering claim"
}
if (-not (@($worldSurfaceLoweringClaim.surfaceKinds) -contains "interactive-world")) {
  throw "EveUnity scene world-surface claim must support interactive-world surfaces"
}
if (-not (@($worldSurfaceLoweringClaim.projectionKinds) -contains "provider-authored-world-surface")) {
  throw "EveUnity scene world-surface claim must support provider-authored-world-surface projections"
}
if ($worldSurfaceLoweringClaim.supportLevel -ne "unity-scene-graph-command-surface") {
  throw "Unexpected EveUnity scene support level: $($worldSurfaceLoweringClaim.supportLevel)"
}
if ($worldSurfaceLoweringClaim.ownership -ne "runtime-lowers-provider-world-surface-without-owning-world-state") {
  throw "Unexpected EveUnity scene ownership: $($worldSurfaceLoweringClaim.ownership)"
}
foreach ($evidencePath in @($worldSurfaceLoweringClaim.evidencePaths)) {
  $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
  if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
    throw "EveUnity scene world-surface claim missing evidence path: $evidencePath"
  }
}

foreach ($feature in @("providerAdvertisements", "commandTransport", "sceneGraphProjection")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveUnity scene provider shell missing supported feature: $feature"
  }
}

$expectedFiles = @(
  "runtimes\incubating\eve-unity-scene\package.json",
  "runtimes\incubating\eve-unity-scene\Runtime\GameCult.Eve.UnityScene.asmdef",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneSurfaceLowerer.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\SaiVisualNovelUnitySceneProjectionAdapter.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\NornGraphUnitySceneProjectionAdapter.cs",
  "runtimes\incubating\eve-unity-scene\Tests\Editor\GameCult.Eve.UnityScene.Tests.asmdef",
  "runtimes\incubating\eve-unity-scene\Tests\Editor\EveUnitySceneSurfaceLowererTests.cs"
)

foreach ($relativePath in $expectedFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity scene provider shell missing file: $relativePath"
  }
}

$lowererSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneSurfaceLowerer.cs") -Raw
foreach ($symbol in @("EveUnitySceneSurfaceLowerer", "EveUnitySceneProviderSurfaceAdvertisement", "WorldInteraction", "CommandBoundary", "ReceiptSchema", "EveSurfaceCommandRequest", "BuildSceneGraph", "BuildPluginProjection", "SaiVisualNovelUnitySceneProjectionAdapter", "EveUnityScenePluginProjection", "EveUnitySceneNode", "SceneObjectKind", "unity-scene")) {
  if (-not $lowererSource.Contains($symbol)) {
    throw "EveUnity scene provider shell lowerer missing symbol: $symbol"
  }
}

$saiAdapterSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\SaiVisualNovelUnitySceneProjectionAdapter.cs") -Raw
foreach ($symbol in @("SaiVisualNovelUnitySceneProjectionAdapter", "sai.vn", "vn.stage", "story.choose", "story.continue", "story.jump", "gamecult.eve.plugin_abi.v1", "sidecar-advertised-plugin-abi", "Sai")) {
  if (-not $saiAdapterSource.Contains($symbol)) {
    throw "EveUnity scene Sai projection adapter missing symbol: $symbol"
  }
}

$nornAdapterSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\NornGraphUnitySceneProjectionAdapter.cs") -Raw
foreach ($symbol in @("NornGraphUnitySceneProjectionAdapter", "norn.graph", "embed.norn", "gamecult.eve.plugin_abi.v1", "sidecar-advertised-plugin-abi", "Norn")) {
  if (-not $nornAdapterSource.Contains($symbol)) {
    throw "EveUnity scene Norn projection adapter missing symbol: $symbol"
  }
}

$testSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Tests\Editor\EveUnitySceneSurfaceLowererTests.cs") -Raw
foreach ($symbol in @("LowerCarriesProviderAdvertisedWorldBoundary", "LowerBuildsProviderAgnosticSceneGraphFromSurfaceTree", "SaiVisualNovelLowersThroughRuntimeProjectionAdapterWithoutOwningStoryState", "CommandIntentCarriesAdvertisedBoundaryWithoutOwningReceipts", "world-projection-node", "sai-vn-scene-stage", "norn-graph-scene-projection", "sai.vn", "norn.graph", "sidecar-advertised-plugin-abi", "aetheria.daemon.commands", "aetheria.eve_command_acceptance_status.v1")) {
  if (-not $testSource.Contains($symbol)) {
    throw "EveUnity scene provider shell tests missing symbol: $symbol"
  }
}

Write-Host "EveUnity scene provider shell smoke passed: $absoluteManifestPath"
