param(
  [string] $EveUnityRoot = "E:\Projects\EveUnity",
  [string] $AetheriaRoot = "E:\Projects\Aetheria"
)

$ErrorActionPreference = "Stop"

$requiredOwnerPaths = @(
  "packages\org.gamecult.eve.surface\package.json",
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

$aetheriaManifest = Get-Content (Join-Path $AetheriaRoot "Packages\manifest.json") -Raw | ConvertFrom-Json
$expectedDependencies = @{
  "org.gamecult.eve.surface" = "https://github.com/GameCult/EveUnity.git?path=/packages/org.gamecult.eve.surface#eveunity-surface-v0.1.0"
  "org.gamecult.eve.unity-uitoolkit" = "https://github.com/GameCult/EveUnity.git?path=/packages/org.gamecult.eve.unity-uitoolkit#eveunity-uitoolkit-v0.1.0"
  "org.gamecult.eve.unity-scene" = "https://github.com/GameCult/EveUnity.git?path=/packages/org.gamecult.eve.unity-scene#eveunity-scene-v0.1.1"
}

foreach ($entry in $expectedDependencies.GetEnumerator()) {
  $actual = $aetheriaManifest.dependencies.($entry.Key)
  if ($actual -ne $entry.Value) {
    throw "Aetheria dependency $($entry.Key) resolves to '$actual', expected '$($entry.Value)'."
  }
}

& (Join-Path $EveUnityRoot "scripts\pack-uitoolkit.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity UI Toolkit package smoke failed."
}

Write-Host "EveUnity owns tagged Unity packages and Aetheria consumes their immutable releases."
