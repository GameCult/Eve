param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-electron\eve-runtime-capability.json",
  [string] $AdvertisementPath = "web\fixtures\aetheria.provider-advertisement.json",
  [string] $OutputPath = "artifacts\eveelectron-capture-contract\latest\capture-request.json",
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
    throw "EveElectron capture contract input not found: $path"
  }
}

$manifest = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json
$captureContract = $manifest.lifecycle.capture.captureContract
if ($null -eq $captureContract) {
  throw "EveElectron capture contract missing lifecycle.capture.captureContract"
}
foreach ($field in @("ownerRepo", "runtimeId", "targetId", "requestSchema", "requestBuilder", "advertisementPath", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveElectron capture contract missing $field"
  }
}
if ($captureContract.ownerRepo -ne "EveElectron") {
  throw "Unexpected EveElectron capture owner: $($captureContract.ownerRepo)"
}
if ($captureContract.runtimeId -ne "electron-shell") {
  throw "Unexpected EveElectron capture runtime: $($captureContract.runtimeId)"
}
if ($captureContract.targetId -ne "electron-shell") {
  throw "Unexpected EveElectron capture target: $($captureContract.targetId)"
}
if ($captureContract.requestSchema -ne "gamecult.eve.runtime_capture_request.v1") {
  throw "Unexpected EveElectron capture request schema: $($captureContract.requestSchema)"
}

$builderPath = Join-Path $projectRoot $captureContract.requestBuilder
if (-not (Test-Path -LiteralPath $builderPath)) {
  throw "EveElectron capture request builder not found: $($captureContract.requestBuilder)"
}
if ((Join-Path $projectRoot $captureContract.advertisementPath) -ne $absoluteAdvertisementPath) {
  throw "EveElectron capture advertisement path mismatch: $($captureContract.advertisementPath) vs $AdvertisementPath"
}

node --test (Join-Path $projectRoot "tools\eveelectron\eveelectron-capture-contract.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveElectron capture contract tests failed with exit code $LASTEXITCODE"
}

node $builderPath --capability $absoluteCapabilityPath --advertisement $absoluteAdvertisementPath --output $absoluteOutputPath --stamp $Stamp
if ($LASTEXITCODE -ne 0) {
  throw "EveElectron capture request builder failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $absoluteOutputPath)) {
  throw "EveElectron capture request was not written: $absoluteOutputPath"
}

$request = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.runtime_capture_request.v1" },
  @{ field = "runtimeId"; value = "electron-shell" },
  @{ field = "ownerRepo"; value = "EveElectron" },
  @{ field = "providerId"; value = "aetheria" },
  @{ field = "surfaceId"; value = "aetheria.daemon.game" },
  @{ field = "targetId"; value = "electron-shell" },
  @{ field = "commandBoundary"; value = "aetheria.daemon.commands" },
  @{ field = "receiptSchema"; value = "aetheria.eve_command_acceptance_status.v1" },
  @{ field = "captureKind"; value = "electron-window-png" },
  @{ field = "artifactKind"; value = "png" },
  @{ field = "conformanceAttachment"; value = "runtime.captureArtifacts[]" }
)) {
  if ($request.($expectation.field) -ne $expectation.value) {
    throw "EveElectron capture request $($expectation.field) expected $($expectation.value) got $($request.($expectation.field))"
  }
}
if ($request.artifactPath -ne "artifacts/eveelectron-capture/$Stamp/electron-shell.png") {
  throw "Unexpected EveElectron capture artifact path: $($request.artifactPath)"
}

Write-Host "EveElectron capture contract smoke passed: $absoluteOutputPath"
