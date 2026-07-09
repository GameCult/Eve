param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-electron\eve-runtime-capability.json",
  [string] $AdvertisementPath = "web\fixtures\aetheria.provider-advertisement.json",
  [string] $SurfacePath = "web\fixtures\aetheria-world-surface.json",
  [string] $OutputPath = "artifacts\eveelectron-capture\latest\electron-shell-projection.json",
  [string] $RequestOutputPath = "artifacts\eveelectron-capture\latest\capture-request.json",
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
    throw "EveElectron capture input not found: $path"
  }
}

node --test (Join-Path $projectRoot "tools\eveelectron\eveelectron-capture-artifact.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveElectron capture artifact tests failed with exit code $LASTEXITCODE"
}

node (Join-Path $projectRoot "tools\eveelectron\eveelectron-capture-artifact.mjs") `
  --capability $absoluteCapabilityPath `
  --advertisement $absoluteAdvertisementPath `
  --surface $absoluteSurfacePath `
  --output $absoluteOutputPath `
  --request-output $absoluteRequestOutputPath `
  --stamp $Stamp
if ($LASTEXITCODE -ne 0) {
  throw "EveElectron capture artifact builder failed with exit code $LASTEXITCODE"
}

foreach ($path in @($absoluteOutputPath, $absoluteRequestOutputPath)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveElectron capture artifact output missing: $path"
  }
}

$projection = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.electron_shell_projection.v1" },
  @{ field = "runtimeId"; value = "electron-shell" },
  @{ field = "providerId"; value = $ExpectedProviderId },
  @{ field = "surfaceId"; value = $ExpectedSurfaceId },
  @{ field = "commandBoundary"; value = $ExpectedCommandBoundary },
  @{ field = "receiptSchema"; value = $ExpectedReceiptSchema },
  @{ field = "artifactKind"; value = "json-projection" },
  @{ field = "captureKind"; value = "electron-shell-projection-json" }
)) {
  if ($projection.($expectation.field) -ne $expectation.value) {
    throw "EveElectron projection $($expectation.field) expected $($expectation.value) got $($projection.($expectation.field))"
  }
}
if (-not $projection.root.id) {
  throw "EveElectron projection capture must contain a root shell node"
}

Write-Host "EveElectron capture smoke passed: $absoluteOutputPath"
