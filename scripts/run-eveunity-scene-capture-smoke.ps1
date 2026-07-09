param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-unity-scene\eve-runtime-capability.json",
  [string] $AdvertisementPath = "web\fixtures\aetheria.provider-advertisement.json",
  [string] $SurfacePath = "web\fixtures\aetheria-world-surface.json",
  [string] $OutputPath = "artifacts\eveunity-scene-capture\latest\unity-scene-projection.json",
  [string] $RequestOutputPath = "artifacts\eveunity-scene-capture\latest\capture-request.json",
  [string] $Stamp = "latest"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
function Resolve-RepoPath([string] $candidate) {
  if ([System.IO.Path]::IsPathRooted($candidate)) {
    return $candidate
  }
  return Join-Path $projectRoot $candidate
}

$absoluteCapabilityPath = Resolve-RepoPath $CapabilityManifestPath
$absoluteAdvertisementPath = Resolve-RepoPath $AdvertisementPath
$absoluteSurfacePath = Resolve-RepoPath $SurfacePath
$absoluteOutputPath = Resolve-RepoPath $OutputPath
$absoluteRequestOutputPath = Resolve-RepoPath $RequestOutputPath

foreach ($path in @($absoluteCapabilityPath, $absoluteAdvertisementPath, $absoluteSurfacePath)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveUnity scene capture input not found: $path"
  }
}

node --test (Join-Path $projectRoot "tools\eveunity\eveunity-scene-capture-artifact.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity scene capture artifact tests failed with exit code $LASTEXITCODE"
}

node (Join-Path $projectRoot "tools\eveunity\eveunity-scene-capture-artifact.mjs") `
  --capability $absoluteCapabilityPath `
  --advertisement $absoluteAdvertisementPath `
  --surface $absoluteSurfacePath `
  --output $absoluteOutputPath `
  --request-output $absoluteRequestOutputPath `
  --stamp $Stamp
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity scene capture artifact builder failed with exit code $LASTEXITCODE"
}

foreach ($path in @($absoluteOutputPath, $absoluteRequestOutputPath)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveUnity scene capture artifact output missing: $path"
  }
}

$projection = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.unity_scene_projection.v1" },
  @{ field = "runtimeId"; value = "unity-scene" },
  @{ field = "providerId"; value = "aetheria" },
  @{ field = "surfaceId"; value = "aetheria.daemon.game" },
  @{ field = "commandBoundary"; value = "aetheria.daemon.commands" },
  @{ field = "receiptSchema"; value = "aetheria.eve_command_acceptance_status.v1" },
  @{ field = "artifactKind"; value = "json-projection" },
  @{ field = "captureKind"; value = "unity-scene-projection-json" }
)) {
  if ($projection.($expectation.field) -ne $expectation.value) {
    throw "EveUnity scene projection $($expectation.field) expected $($expectation.value) got $($projection.($expectation.field))"
  }
}
if (-not $projection.root.id) {
  throw "EveUnity scene projection capture must contain a root scene node"
}

Write-Host "EveUnity scene capture smoke passed: $absoluteOutputPath"
