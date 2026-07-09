param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-tui\eve-runtime-capability.json",
  [string] $AdvertisementPath = "web\fixtures\aetheria.provider-advertisement.json",
  [string] $SurfacePath = "web\fixtures\aetheria-world-surface.json",
  [string] $OutputPath = "artifacts\evetui-capture\latest\tui-grid.json",
  [string] $RequestOutputPath = "artifacts\evetui-capture\latest\capture-request.json",
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
    throw "EveTui capture input not found: $path"
  }
}

node --test (Join-Path $projectRoot "tools\evetui\evetui-capture-artifact.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveTui capture artifact tests failed with exit code $LASTEXITCODE"
}

node (Join-Path $projectRoot "tools\evetui\evetui-capture-artifact.mjs") `
  --capability $absoluteCapabilityPath `
  --advertisement $absoluteAdvertisementPath `
  --surface $absoluteSurfacePath `
  --output $absoluteOutputPath `
  --request-output $absoluteRequestOutputPath `
  --stamp $Stamp
if ($LASTEXITCODE -ne 0) {
  throw "EveTui capture artifact builder failed with exit code $LASTEXITCODE"
}

foreach ($path in @($absoluteOutputPath, $absoluteRequestOutputPath)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveTui capture artifact output missing: $path"
  }
}

$grid = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.tui_grid.v1" },
  @{ field = "runtimeId"; value = "tui" },
  @{ field = "providerId"; value = $ExpectedProviderId },
  @{ field = "surfaceId"; value = $ExpectedSurfaceId },
  @{ field = "commandBoundary"; value = $ExpectedCommandBoundary },
  @{ field = "receiptSchema"; value = $ExpectedReceiptSchema },
  @{ field = "artifactKind"; value = "json-grid" },
  @{ field = "captureKind"; value = "terminal-cell-grid" }
)) {
  if ($grid.($expectation.field) -ne $expectation.value) {
    throw "EveTui grid $($expectation.field) expected $($expectation.value) got $($grid.($expectation.field))"
  }
}
if (@($grid.lines).Count -lt 1) {
  throw "EveTui grid capture must contain terminal lines"
}

Write-Host "EveTui capture smoke passed: $absoluteOutputPath"
