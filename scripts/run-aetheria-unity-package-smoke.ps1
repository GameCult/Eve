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
if (-not (Test-Path $manifestPath)) {
  throw "Aetheria Unity package manifest not found: $manifestPath"
}
if (-not (Test-Path $unityToolkitProject)) {
  throw "Aetheria Unity Toolkit project not found: $unityToolkitProject"
}
if (-not (Test-Path $surfaceProject)) {
  throw "Aetheria Eve Surface project not found: $surfaceProject"
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath
foreach ($dependency in @(
  '"org.gamecult.eve.surface": "file:../../Eve/packages/org.gamecult.eve.surface"',
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

Push-Location $AetheriaRoot
try {
  dotnet build GameCult.Eve.UnityUIToolkit.csproj --no-restore --nologo -v:minimal
} finally {
  Pop-Location
}
