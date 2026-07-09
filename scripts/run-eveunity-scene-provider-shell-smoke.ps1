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
if ($worldSurfaceLoweringClaim.supportLevel -ne "unity-playable-world-scene-command-surface") {
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

foreach ($feature in @("providerAdvertisements", "commandTransport", "providerSurfaceSession", "providerSurfaceSource", "livePlayableWorldClient", "providerCommandReceipts", "providerAssetManifestDocumentSource", "sceneGraphProjection", "playableWorldProjection", "playableWorldScenePresentation", "unityGameObjectSceneSink", "providerAssetManifestResolution", "providerAssetManifestSource")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveUnity scene provider shell missing supported feature: $feature"
  }
}

$expectedFiles = @(
  "runtimes\incubating\eve-unity-scene\package.json",
  "runtimes\incubating\eve-unity-scene\Runtime\GameCult.Eve.UnityScene.asmdef",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneSurfaceLowerer.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneClientSession.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneProviderConnection.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnityPlayableWorldLiveClient.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnityPlayableWorldPresenter.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnityGameObjectPlayableWorldSceneSink.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnityPlayableWorldAssetManifest.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\SaiVisualNovelUnitySceneProjectionAdapter.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\NornGraphUnitySceneProjectionAdapter.cs",
  "runtimes\incubating\eve-unity-scene\Runtime\TeXMathUnitySceneProjectionAdapter.cs",
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
foreach ($symbol in @("EveUnitySceneSurfaceLowerer", "EveUnitySceneProviderSurfaceAdvertisement", "WorldInteraction", "CommandBoundary", "ReceiptSchema", "EveSurfaceCommandRequest", "BuildSceneGraph", "BuildPlayableWorld", "EveUnityPlayableWorldProjection", "EveUnityPlayableWorldEntity", "BuildPluginProjection", "SaiVisualNovelUnitySceneProjectionAdapter", "TeXMathUnitySceneProjectionAdapter", "EveUnityScenePluginProjection", "EveUnitySceneNode", "SceneObjectKind", "playable-world-root", "unity-scene")) {
  if (-not $lowererSource.Contains($symbol)) {
    throw "EveUnity scene provider shell lowerer missing symbol: $symbol"
  }
}

$clientSessionSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneClientSession.cs") -Raw
foreach ($symbol in @("EveUnitySceneClientSession", "EveUnitySceneProviderSurfaceSnapshot", "ActiveVersion", "Connect", "ApplySnapshot", "CreateMoveIntent", "CreateFocusIntent", "CreateTargetIntent", "CreateActionIntent", "CreatePlayableWorldIntent", "commandId", "targetPosition", "unity-scene")) {
  if (-not $clientSessionSource.Contains($symbol)) {
    throw "EveUnity scene client session missing symbol: $symbol"
  }
}

$providerConnectionSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneProviderConnection.cs") -Raw
foreach ($symbol in @("IEveUnitySceneProviderSurfaceSource", "IEveUnitySceneCommandSink", "EveUnitySceneProviderConnection", "SnapshotAvailable", "CurrentSnapshot", "Connect", "Refresh", "SubmitMoveIntent", "SubmitFocusIntent", "SubmitTargetIntent", "SubmitActionIntent", "Disconnect")) {
  if (-not $providerConnectionSource.Contains($symbol)) {
    throw "EveUnity scene provider connection missing symbol: $symbol"
  }
}

$liveClientSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnityPlayableWorldLiveClient.cs") -Raw
foreach ($symbol in @("EveUnityPlayableWorldLiveClient", "IEveUnitySceneCommandReceiptSource", "EveUnitySceneCommandReceipt", "EveUnitySceneProviderConnection", "EveUnityPlayableWorldPresenter", "ActiveWorld", "LastPresentation", "LastReceipt", "ReceiptAvailable", "Connect", "Refresh", "SubmitMoveIntent", "SubmitFocusIntent", "SubmitTargetIntent", "SubmitActionIntent", "ProjectionUpdated", "ShouldRefreshProviderSurface", "IsProviderOwned", "Disconnect")) {
  if (-not $liveClientSource.Contains($symbol)) {
    throw "EveUnity playable world live client missing symbol: $symbol"
  }
}

$playableWorldPresenterSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnityPlayableWorldPresenter.cs") -Raw
foreach ($symbol in @("IEveUnityPlayableWorldSceneSink", "IEveUnityPlayableWorldAssetResolver", "EveUnityPlayableWorldPresenter", "EveUnityPlayableWorldAssetBinding", "EveUnityPlayableWorldPresentation", "EveUnityAssetRefResolver", "ConfigureWorld", "UpsertEntity", "RemoveEntity", "provider-asset-ref", "unity-generated-placeholder")) {
  if (-not $playableWorldPresenterSource.Contains($symbol)) {
    throw "EveUnity playable world presenter missing symbol: $symbol"
  }
}

$gameObjectSceneSinkSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnityGameObjectPlayableWorldSceneSink.cs") -Raw
foreach ($symbol in @("EveUnityGameObjectPlayableWorldSceneSink", "IEveUnityGameObjectAssetProvider", "EveUnityResourcesAssetProvider", "EveUnityPlayableWorldEntityMarker", "GameObject", "Transform", "Resources.Load", "PrimitiveType.Capsule", "DestroyImmediate", "localPosition", "localRotation")) {
  if (-not $gameObjectSceneSinkSource.Contains($symbol)) {
    throw "EveUnity GameObject playable world scene sink missing symbol: $symbol"
  }
}

$assetManifestSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnityPlayableWorldAssetManifest.cs") -Raw
foreach ($symbol in @("EveUnityPlayableWorldAssetManifest", "IEveUnityPlayableWorldAssetManifestSource", "IEveUnityPlayableWorldAssetManifestDocumentSource", "EveUnityPlayableWorldAssetManifestDocumentSource", "EveUnityPlayableWorldAssetManifestDocument", "EveUnityPlayableWorldAssetManifestDocumentEntry", "FromDocument", "DocumentAvailable", "gamecult.eve.unity_playable_world_asset_manifest.v1", "EveUnityPlayableWorldAssetManifestCache", "EveUnityPlayableWorldAssetManifestEntry", "EveUnityManifestGameObjectAssetProvider", "ManifestAvailable", "GetForWorld", "CreateGameObjectAssetProvider", "ManifestRef", "ResourcesPath", "PrefabKey", "NormalizeResourcesPath", "ResolvePrefab", "Resources.Load")) {
  if (-not $assetManifestSource.Contains($symbol)) {
    throw "EveUnity playable world asset manifest missing symbol: $symbol"
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

$texAdapterSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\TeXMathUnitySceneProjectionAdapter.cs") -Raw
foreach ($symbol in @("TeXMathUnitySceneProjectionAdapter", "tex.math", "embed.tex", "tex.scene-placement", "gamecult.eve.plugin_abi.v1", "sidecar-advertised-plugin-abi", "EvePlugins")) {
  if (-not $texAdapterSource.Contains($symbol)) {
    throw "EveUnity scene TeX projection adapter missing symbol: $symbol"
  }
}

$testSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Tests\Editor\EveUnitySceneSurfaceLowererTests.cs") -Raw
foreach ($symbol in @("LowerCarriesProviderAdvertisedWorldBoundary", "LowerBuildsProviderAgnosticSceneGraphFromSurfaceTree", "LowerExtractsPlayableArpgWorldFromGenericScene3dSurface", "GenericClientSessionConsumesAetheriaPlayableWorldSnapshotWithoutAetheriaTypes", "GenericProviderConnectionAppliesLiveSnapshotsAndSubmitsCommandsThroughSink", "PlayableWorldPresenterInstantiatesUpdatesAndDespawnsProviderEntities", "LivePlayableWorldClientPresentsProviderSnapshotsAndKeepsCommandsProviderOwned", "LivePlayableWorldClientRefreshesFromProviderSnapshotAfterReceiptWithoutOwningMovement", "AssetManifestMapsProviderAssetRefsToUnityLoadKeysWithoutAetheriaTypes", "AssetManifestCacheTracksPlayableWorldManifestPointerAndLiveUpdates", "AssetManifestDocumentSourceFeedsCacheWithoutChangingSceneLowering", "FakeProviderSurfaceSource", "FakeCommandReceiptSource", "FakeAssetManifestSource", "FakeAssetManifestDocumentSource", "FakeCommandSink", "FakePlayableWorldSceneSink", "SaiVisualNovelLowersThroughRuntimeProjectionAdapterWithoutOwningStoryState", "CommandIntentCarriesAdvertisedBoundaryWithoutOwningReceipts", "pending", "reconciled", "world-projection-node", "playable-world-root", "playable-world-entity", "world-field-3d", "arpg-third-person", "cultmesh://aetheria/assets/manifest", "cultmesh://aetheria/eve/surfaces/aetheria.daemon.game", "aetheria.daemon.move_intent", "sai-vn-scene-stage", "norn-graph-scene-projection", "tex-math-scene-projection", "sai.vn", "norn.graph", "tex.math", "sidecar-advertised-plugin-abi", "aetheria.daemon.commands", "aetheria.eve_command_acceptance_status.v1")) {
  if (-not $testSource.Contains($symbol)) {
    throw "EveUnity scene provider shell tests missing symbol: $symbol"
  }
}

Write-Host "EveUnity scene provider shell smoke passed: $absoluteManifestPath"
