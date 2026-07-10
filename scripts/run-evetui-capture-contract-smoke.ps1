param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-tui\eve-runtime-capability.json",
  [string] $AdvertisementPath = "..\Aetheria\conformance\eve\aetheria.provider-advertisement.json",
  [string] $OutputPath = "artifacts\evetui-capture-contract\latest\capture-request.json",
  [string] $Stamp = "smoke"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteCapabilityPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}
$absoluteAdvertisementPath = if ([System.IO.Path]::IsPathRooted($AdvertisementPath)) {
  $AdvertisementPath
} else {
  Join-Path $projectRoot $AdvertisementPath
}
$absoluteOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path $projectRoot $OutputPath
}

foreach ($path in @($absoluteCapabilityPath, $absoluteAdvertisementPath)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveTui capture contract input not found: $path"
  }
}

$manifest = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json
$captureContract = $manifest.lifecycle.capture.captureContract
if ($null -eq $captureContract) {
  throw "EveTui capture contract missing lifecycle.capture.captureContract"
}
foreach ($field in @("ownerRepo", "runtimeId", "targetId", "requestSchema", "requestBuilder", "advertisementPath", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveTui capture contract missing $field"
  }
}
if ($captureContract.ownerRepo -ne "EveTui") {
  throw "Unexpected EveTui capture owner: $($captureContract.ownerRepo)"
}
if ($captureContract.runtimeId -ne "tui") {
  throw "Unexpected EveTui capture runtime: $($captureContract.runtimeId)"
}
if ($captureContract.targetId -ne "tui") {
  throw "Unexpected EveTui capture target: $($captureContract.targetId)"
}
if ($captureContract.requestSchema -ne "gamecult.eve.runtime_capture_request.v1") {
  throw "Unexpected EveTui capture request schema: $($captureContract.requestSchema)"
}

$builderPath = Join-Path $projectRoot $captureContract.requestBuilder
if (-not (Test-Path -LiteralPath $builderPath)) {
  throw "EveTui capture request builder not found: $($captureContract.requestBuilder)"
}
if ((Join-Path $projectRoot $captureContract.advertisementPath) -ne $absoluteAdvertisementPath) {
  throw "EveTui capture advertisement path mismatch: $($captureContract.advertisementPath) vs $AdvertisementPath"
}

node --test (Join-Path $projectRoot "tools\evetui\evetui-capture-contract.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveTui capture contract tests failed with exit code $LASTEXITCODE"
}

node $builderPath --capability $absoluteCapabilityPath --advertisement $absoluteAdvertisementPath --output $absoluteOutputPath --stamp $Stamp
if ($LASTEXITCODE -ne 0) {
  throw "EveTui capture request builder failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $absoluteOutputPath)) {
  throw "EveTui capture request was not written: $absoluteOutputPath"
}

$request = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.runtime_capture_request.v1" },
  @{ field = "runtimeId"; value = "tui" },
  @{ field = "ownerRepo"; value = "EveTui" },
  @{ field = "providerId"; value = "aetheria" },
  @{ field = "surfaceId"; value = "aetheria.daemon.game" },
  @{ field = "targetId"; value = "tui" },
  @{ field = "commandBoundary"; value = "aetheria.daemon.commands" },
  @{ field = "receiptSchema"; value = "aetheria.eve_command_acceptance_status.v1" },
  @{ field = "captureKind"; value = "terminal-cell-grid" },
  @{ field = "artifactKind"; value = "json-grid" },
  @{ field = "conformanceAttachment"; value = "runtime.captureArtifacts[]" }
)) {
  if ($request.($expectation.field) -ne $expectation.value) {
    throw "EveTui capture request $($expectation.field) expected $($expectation.value) got $($request.($expectation.field))"
  }
}
if ($request.artifactPath -ne "artifacts/evetui-capture/$Stamp/tui-grid.json") {
  throw "Unexpected EveTui capture artifact path: $($request.artifactPath)"
}

Write-Host "EveTui capture contract smoke passed: $absoluteOutputPath"
