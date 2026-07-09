param(
  [string] $CapabilityManifestPath = "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json",
  [string] $AdvertisementPath = "web\fixtures\aetheria.provider-advertisement.json",
  [string] $SurfacePath = "web\fixtures\aetheria-world-surface.json",
  [string] $OutputPath = "artifacts\eveunity-uitoolkit-capture\latest\unity-uitoolkit-projection.json",
  [string] $RequestOutputPath = "artifacts\eveunity-uitoolkit-capture\latest\capture-request.json",
  [string] $Stamp = "latest",
  [string] $ExpectedProviderId = "aetheria",
  [string] $ExpectedSurfaceId = "aetheria.daemon.game",
  [string] $ExpectedCommandBoundary = "aetheria.daemon.commands",
  [string] $ExpectedReceiptSchema = "aetheria.eve_command_acceptance_status.v1"
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
    throw "EveUnity UI Toolkit capture input not found: $path"
  }
}

node --test (Join-Path $projectRoot "tools\eveunity\eveunity-uitoolkit-capture-artifact.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity UI Toolkit capture artifact tests failed with exit code $LASTEXITCODE"
}

node (Join-Path $projectRoot "tools\eveunity\eveunity-uitoolkit-capture-artifact.mjs") `
  --capability $absoluteCapabilityPath `
  --advertisement $absoluteAdvertisementPath `
  --surface $absoluteSurfacePath `
  --output $absoluteOutputPath `
  --request-output $absoluteRequestOutputPath `
  --stamp $Stamp
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity UI Toolkit capture artifact builder failed with exit code $LASTEXITCODE"
}

foreach ($path in @($absoluteOutputPath, $absoluteRequestOutputPath)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveUnity UI Toolkit capture artifact output missing: $path"
  }
}

$projection = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.unity_uitoolkit_projection.v1" },
  @{ field = "runtimeId"; value = "unity-uitoolkit" },
  @{ field = "providerId"; value = $ExpectedProviderId },
  @{ field = "surfaceId"; value = $ExpectedSurfaceId },
  @{ field = "commandBoundary"; value = $ExpectedCommandBoundary },
  @{ field = "receiptSchema"; value = $ExpectedReceiptSchema },
  @{ field = "artifactKind"; value = "json-projection" },
  @{ field = "captureKind"; value = "unity-uitoolkit-projection-json" }
)) {
  if ($projection.($expectation.field) -ne $expectation.value) {
    throw "EveUnity UI Toolkit projection $($expectation.field) expected $($expectation.value) got $($projection.($expectation.field))"
  }
}
if (-not $projection.root.id) {
  throw "EveUnity UI Toolkit projection capture must contain a root UI node"
}
if (-not (@($projection.root.classNames) -contains "eve-component")) {
  throw "EveUnity UI Toolkit projection capture root missing eve-component class"
}

Write-Host "EveUnity UI Toolkit capture smoke passed: $absoluteOutputPath"
