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
$surfaceProject = Join-Path $AetheriaRoot "GameCult.Eve.Surface.csproj"
$aetheriaEveRuntimePackage = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.eve-runtime\package.json"
$aetheriaEveRuntimeAsmdef = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.eve-runtime\Runtime\GameCult.Aetheria.EveRuntime.asmdef"
$aetheriaSceneBridge = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.eve-runtime\Runtime\AetheriaEveUnitySceneProviderBridge.cs"
$aetheriaGameSurfaceBuilder = Join-Path $AetheriaRoot "Packages\org.gamecult.aetheria.state\Runtime\AetheriaRuntimeDaemonGameSurfaceBuilder.cs"
if (-not (Test-Path $manifestPath)) {
  throw "Aetheria Unity package manifest not found: $manifestPath"
}
if (-not (Test-Path $unityToolkitProject)) {
  throw "Aetheria Unity Toolkit project not found: $unityToolkitProject"
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
if (-not (Test-Path $aetheriaGameSurfaceBuilder)) {
  throw "Aetheria daemon game surface builder not found: $aetheriaGameSurfaceBuilder"
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath
foreach ($dependency in @(
  '"org.gamecult.eve.surface": "file:../../Eve/packages/org.gamecult.eve.surface"',
  '"org.gamecult.eve.unity-scene": "file:../../Eve/runtimes/incubating/eve-unity-scene"',
  '"org.gamecult.eve.unity-uitoolkit": "file:../../Eve/packages/org.gamecult.eve.unity-uitoolkit"'
)) {
  if (-not $manifest.Contains($dependency)) {
    throw "Aetheria Packages\manifest.json missing Eve package dependency: $dependency"
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
  "IEveUnitySceneProviderSurfaceDocumentSource",
  "IEveUnityPlayableWorldAssetManifestDocumentSource",
  "IEveUnitySceneCommandSink",
  "AetheriaEveRuntimeUnityHooks.RequireControl"
)) {
  if (-not $sceneBridge.Contains($symbol)) {
    throw "Aetheria Eve Unity scene bridge missing symbol: $symbol"
  }
}

$gameSurfaceBuilder = Get-Content -Raw -LiteralPath $aetheriaGameSurfaceBuilder
foreach ($symbol in @(
  '"world.scene3d"',
  '"world.entity3d"',
  '"movementCommand"',
  '"assetManifest"',
  '"prefab.entity.ship"',
  '"prefab.entity.station"'
)) {
  if (-not $gameSurfaceBuilder.Contains($symbol)) {
    throw "Aetheria daemon game surface is not publishing playable world symbol: $symbol"
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
} finally {
  Pop-Location
}
