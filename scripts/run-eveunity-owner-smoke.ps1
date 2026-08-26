param(
  [string] $EveUnityRoot = "E:\Projects\EveUnity",
  [string] $AetheriaRoot = "E:\Projects\AetheriaEve"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

$requiredOwnerPaths = @(
  "packages\org.gamecult.eve.unity-uitoolkit\package.json",
  "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json",
  "packages\org.gamecult.eve.unity-scene\package.json",
  "packages\org.gamecult.eve.unity-scene\eve-runtime-capability.json",
  "scripts\pack-uitoolkit.ps1",
  "scripts\run-uitoolkit-tests.ps1",
  "scripts\run-release-consumer-tests.ps1",
  "ReleaseConsumerProject\Packages\manifest.json",
  "ReleaseConsumerProject\Packages\packages-lock.json"
)

foreach ($relativePath in $requiredOwnerPaths) {
  $path = Join-Path $EveUnityRoot $relativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "EveUnity owner path is missing: $path"
  }
}

$deletedSurfacePackage = Join-Path $EveUnityRoot "packages\org.gamecult.eve.surface"
if (Test-Path -LiteralPath $deletedSurfacePackage) {
  throw "EveUnity must consume Eve's renderer-neutral surface package instead of vendoring it: $deletedSurfacePackage"
}

$eveSurface = Get-Content (Join-Path $projectRoot "packages\org.gamecult.eve.surface\package.json") -Raw | ConvertFrom-Json
$unityScene = Get-Content (Join-Path $EveUnityRoot "packages\org.gamecult.eve.unity-scene\package.json") -Raw | ConvertFrom-Json
$unityToolkit = Get-Content (Join-Path $EveUnityRoot "packages\org.gamecult.eve.unity-uitoolkit\package.json") -Raw | ConvertFrom-Json
if ($eveSurface.dependencies.'org.gamecult.cultlib' -ne '1.0.56') {
  throw "Eve surface must declare the admitted CultLib 1.0.56 contract."
}
if ($unityScene.dependencies.'org.gamecult.eve.surface' -ne $eveSurface.version -or
    $unityToolkit.dependencies.'org.gamecult.eve.surface' -ne $eveSurface.version) {
  throw "Every EveUnity package must declare Eve surface $($eveSurface.version)."
}

$aetheriaManifest = Get-Content (Join-Path $AetheriaRoot "Aetheria.Unity\Packages\manifest.json") -Raw | ConvertFrom-Json
foreach ($packageName in @('org.gamecult.eve.surface', 'org.gamecult.eve.unity-scene', 'org.gamecult.eve.unity-uitoolkit')) {
  $actual = $aetheriaManifest.dependencies.$packageName
  if ($actual -notmatch '^https://github\.com/GameCult/(Eve|EveUnity)\.git\?path=/.+#[0-9a-f]{40}$') {
    throw "Aetheria dependency $packageName must resolve from its owner repository at an immutable commit, found '$actual'."
  }
}

& (Join-Path $EveUnityRoot "scripts\pack-uitoolkit.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity UI Toolkit package smoke failed."
}

Write-Host "Eve owns the surface contract; EveUnity owns Unity lowering; Aetheria consumes both at immutable commits."
