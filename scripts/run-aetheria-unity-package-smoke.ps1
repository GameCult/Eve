param(
  [string] $AetheriaRoot = "E:\Projects\Aetheria"
)

$ErrorActionPreference = "Stop"

$eveRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path $AetheriaRoot)) {
  throw "Aetheria repo not found: $AetheriaRoot"
}

$manifestPath = Join-Path $AetheriaRoot "Packages\manifest.json"
$unityToolkitProject = Join-Path $AetheriaRoot "GameCult.Eve.UnityUIToolkit.csproj"
$unitySceneProject = Join-Path $AetheriaRoot "GameCult.Eve.UnityScene.csproj"
$surfaceProject = Join-Path $AetheriaRoot "GameCult.Eve.Surface.csproj"
$aetheriaEveRuntimePackage = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.eve-runtime\package.json"
$aetheriaEveRuntimeAsmdef = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.eve-runtime\Runtime\GameCult.Aetheria.EveRuntime.asmdef"
$aetheriaSceneBridge = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.eve-runtime\Runtime\AetheriaEveUnitySceneProviderBridge.cs"
$aetheriaSceneProviderComponent = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.eve-runtime\Runtime\AetheriaEveUnitySceneProviderComponent.cs"
$aetheriaSurfaceCatalog = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.state\Runtime\AetheriaRuntimeEveSurfaceCatalog.cs"
$aetheriaGameSurfaceBuilder = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.state\Runtime\AetheriaRuntimeDaemonGameSurfaceBuilder.cs"
$aetheriaDaemonOperationsClient = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.state\Runtime\AetheriaRuntimeDaemonOperationsClient.cs"
if (-not (Test-Path $manifestPath)) {
  throw "Aetheria Unity package manifest not found: $manifestPath"
}
if (-not (Test-Path $unityToolkitProject)) {
  throw "Aetheria Unity Toolkit project not found: $unityToolkitProject"
}
if (-not (Test-Path $unitySceneProject)) {
  throw "Aetheria Unity Scene project not found: $unitySceneProject"
}
if (-not (Test-Path $surfaceProject)) {
  throw "Aetheria Eve Surface project not found: $surfaceProject"
}
if (-not (Test-Path $aetheriaEveRuntimePackage)) {
  throw "Aetheria Eve runtime package manifest not found: $aetheriaEveRuntimePackage"
}
if (-not (Test-Path $aetheriaEveRuntimeAsmdef)) {
  throw "Aetheria Eve runtime asmdef not found: $aetheriaEveRuntimeAsmdef"
}
if (-not (Test-Path $aetheriaSceneBridge)) {
  throw "Aetheria Eve Unity scene provider bridge not found: $aetheriaSceneBridge"
}
if (-not (Test-Path $aetheriaSceneProviderComponent)) {
  throw "Aetheria Eve Unity scene provider component not found: $aetheriaSceneProviderComponent"
}
if (-not (Test-Path $aetheriaSurfaceCatalog)) {
  throw "Aetheria Eve surface catalog not found: $aetheriaSurfaceCatalog"
}
if (-not (Test-Path $aetheriaGameSurfaceBuilder)) {
  throw "Aetheria daemon game surface builder not found: $aetheriaGameSurfaceBuilder"
}
if (-not (Test-Path $aetheriaDaemonOperationsClient)) {
  throw "Aetheria daemon operations client not found: $aetheriaDaemonOperationsClient"
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$requiredDependencies = @{
  "org.gamecult.eve.surface" = "file:../../Eve/packages/org.gamecult.eve.surface"
  "org.gamecult.eve.unity-scene" = "file:../../Eve/runtimes/incubating/eve-unity-scene"
  "org.gamecult.eve.unity-uitoolkit" = "file:../../Eve/packages/org.gamecult.eve.unity-uitoolkit"
}
foreach ($dependencyName in $requiredDependencies.Keys) {
  $actualDependency = $manifest.dependencies.$dependencyName
  if ($actualDependency -ne $requiredDependencies[$dependencyName]) {
    throw "Aetheria Packages\manifest.json dependency $dependencyName expected $($requiredDependencies[$dependencyName]) but found $actualDependency"
  }
}

$project = Get-Content -Raw -LiteralPath $unityToolkitProject
$requiredCompileItems = @(
  "Runtime\EveUiToolkitSurfaceOptions.cs",
  "Runtime\EveUiToolkitSurfaceLowerer.cs",
  "Runtime\IEveUiToolkitPluginProjectionAdapter.cs",
  "Runtime\SaiVisualNovelUiToolkitProjectionAdapter.cs",
  "Runtime\NornGraphUiToolkitProjectionAdapter.cs",
  "Runtime\TeXMathUiToolkitProjectionAdapter.cs"
)
foreach ($compileItem in $requiredCompileItems) {
  $expected = Join-Path $eveRoot "packages\org.gamecult.eve.unity-uitoolkit\$compileItem"
  if (-not $project.Contains($expected)) {
    throw "Aetheria GameCult.Eve.UnityUIToolkit.csproj missing compile item: $expected"
  }
}

$sceneProject = Get-Content -Raw -LiteralPath $unitySceneProject
$requiredSceneCompileItems = @(
  "Runtime\EveUnitySceneSurfaceLowerer.cs",
  "Runtime\EveUnitySceneClientSession.cs",
  "Runtime\EveUnitySceneProviderConnection.cs",
  "Runtime\EveUnityPlayableWorldLiveClient.cs",
  "Runtime\EveUnityPlayableWorldRuntime.cs",
  "Runtime\EveUnityPlayableWorldClientHost.cs",
  "Runtime\EveUnityPlayableWorldClientBootstrap.cs",
  "Runtime\EveUnityPlayableWorldInputDriver.cs",
  "Runtime\EveUnityPlayableWorldCameraRig.cs",
  "Runtime\EveUnityGameObjectPlayableWorldSceneSink.cs",
  "Runtime\EveUnityPlayableWorldAssetManifest.cs"
)
foreach ($compileItem in $requiredSceneCompileItems) {
  $expected = Join-Path $eveRoot "runtimes\incubating\eve-unity-scene\$compileItem"
  if (-not $sceneProject.Contains($expected)) {
    throw "Aetheria GameCult.Eve.UnityScene.csproj missing compile item: $expected"
  }
}

$runtimePackage = Get-Content -Raw -LiteralPath $aetheriaEveRuntimePackage
foreach ($dependency in @(
  '"org.gamecult.eve.unity-scene": "0.1.0"',
  '"org.gamecult.eve.unity-uitoolkit": "0.1.0"'
)) {
  if (-not $runtimePackage.Contains($dependency)) {
    throw "Aetheria Eve runtime package missing dependency: $dependency"
  }
}

$asmdef = Get-Content -Raw -LiteralPath $aetheriaEveRuntimeAsmdef
if (-not $asmdef.Contains('"GameCult.Eve.UnityScene"')) {
  throw "Aetheria Eve runtime asmdef does not reference GameCult.Eve.UnityScene"
}

$sceneBridge = Get-Content -Raw -LiteralPath $aetheriaSceneBridge
foreach ($symbol in @(
  "IEveUnitySceneLiveProviderTransport",
  "IEveUnitySceneProviderSurfaceDocumentSource",
  "IEveUnityPlayableWorldAssetManifestDocumentSource",
  "IEveUnitySceneCommandSink",
  "IEveUnitySceneCommandReceiptSource",
  "IEveUnityProviderRefreshSource",
  "TransportKind",
  "SurfacePointer",
  "AssetManifestPointer",
  "ManifestRef",
  "ReceiptAvailable",
  "Connect",
  "Disconnect",
  "SubmitCommand",
  "ReadAdvertisedSurface",
  "runtimeState.ProviderAdvertisement.Latest",
  "WorldInteraction",
  "AetheriaEveRuntimeUnityHooks.RequireControl",
  "ToReceipt(request, daemonEnvelope)",
  "ToReceipt(request, envelope)"
)) {
  if (-not $sceneBridge.Contains($symbol)) {
    throw "Aetheria Eve Unity scene bridge missing symbol: $symbol"
  }
}

$sceneProviderComponent = Get-Content -Raw -LiteralPath $aetheriaSceneProviderComponent
foreach ($symbol in @(
  "AetheriaEveUnitySceneProviderComponent",
  "EveUnitySceneLiveProviderTransportBehaviour",
  "IEveUnitySceneProviderSurfaceDocumentSource",
  "IEveUnityPlayableWorldAssetManifestDocumentSource",
  "IEveUnitySceneCommandSink",
  "IEveUnitySceneCommandReceiptSource",
  "IEveUnityProviderRefreshSource",
  "TransportKind",
  "SurfaceDocumentAvailable",
  "CommandReceiptAvailable",
  "AssetManifestDocumentAvailable",
  "AetheriaEveUnitySceneProviderBridge",
  "ReceiptAvailable",
  "stateFilePathOverride",
  "surfaceId",
  "runtimeId",
  "Refresh",
  "Submit",
  "SubmitCommand"
)) {
  if (-not $sceneProviderComponent.Contains($symbol)) {
    throw "Aetheria Eve Unity scene provider component missing symbol: $symbol"
  }
}

$surfaceCatalog = Get-Content -Raw -LiteralPath $aetheriaSurfaceCatalog
foreach ($symbol in @(
  "AetheriaRuntimeEveWorldInteractionAdvertisement",
  "SurfaceKind",
  "WorldInteraction",
  "Find",
  '"interactive-world"',
  '"provider-authored-world-surface"',
  '"provider-authored-world-editor-surface"',
  '"unity-scene"',
  "AetheriaRuntimeDaemonSchemas.EveCommandAcceptanceStatus",
  '"provider-owns-world-state-assets-command-acceptance-and-receipts"'
)) {
  if (-not $surfaceCatalog.Contains($symbol)) {
    throw "Aetheria Eve surface catalog missing advertised world-interaction symbol: $symbol"
  }
}

$gameSurfaceBuilder = Get-Content -Raw -LiteralPath $aetheriaGameSurfaceBuilder
foreach ($symbol in @(
  '"world.scene3d"',
  '"world.entity3d"',
  '"movementCommand"',
  '"assetManifest"',
  '"arpg.pointer-keyboard.v1"',
  '"arpg.orbital-follow.v1"',
  'SetMoveVector',
  '"prefab.entity.ship"',
  '"prefab.entity.station"'
)) {
  if (-not $gameSurfaceBuilder.Contains($symbol)) {
    throw "Aetheria daemon game surface is not publishing playable world symbol: $symbol"
  }
}

$daemonOperationsClient = Get-Content -Raw -LiteralPath $aetheriaDaemonOperationsClient
foreach ($symbol in @(
  "TrySubmitSurfaceCommand",
  "SetMoveVector",
  '"directionX"',
  '"directionY"',
  '"scalarValue"',
  "SetTarget",
  '"targetEntityId"',
  "FireWeaponGroup",
  '"weaponGroup"',
  '"actionId"'
)) {
  if (-not $daemonOperationsClient.Contains($symbol)) {
    throw "Aetheria daemon surface command adapter is not consuming playable world command payload symbol: $symbol"
  }
}

$aetheriaAssets = Get-Content -Raw -LiteralPath (Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.state\Runtime\AetheriaRuntimeAssets.cs")
foreach ($symbol in @(
  '"prefab.entity.player"',
  '"Prefabs/Ships/Djinni"',
  '"prefab.entity.station"',
  '"Prefabs/Stations/AsteroidOutpost"',
  '"resourcesPath"'
)) {
  if (-not $aetheriaAssets.Contains($symbol)) {
    throw "Aetheria asset manifest is not publishing Unity playable world asset symbol: $symbol"
  }
}

Push-Location $AetheriaRoot
try {
  dotnet build GameCult.Eve.UnityUIToolkit.csproj --no-restore --nologo -v:minimal
  dotnet build GameCult.Eve.UnityScene.csproj --no-restore --nologo -v:minimal
} finally {
  Pop-Location
}
