param(
  [string] $CapabilityManifestPath = "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json",
  [string] $AdvertisementPath = "web\fixtures\aetheria.provider-advertisement.json",
  [string] $OutputPath = "artifacts\eveunity-uitoolkit-capture-contract\latest\capture-request.json",
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
    throw "EveUnity capture contract input not found: $path"
  }
}

$manifest = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json
$captureContract = $manifest.lifecycle.capture.captureContract
if ($null -eq $captureContract) {
  throw "EveUnity capture contract missing lifecycle.capture.captureContract"
}
foreach ($field in @("ownerRepo", "runtimeId", "targetId", "requestSchema", "requestBuilder", "advertisementPath", "captureKind", "artifactKind", "artifactPattern", "conformanceAttachment", "requiredProvider", "requiredSurface", "authority", "publishProof")) {
  if (-not $captureContract.$field) {
    throw "EveUnity capture contract missing $field"
  }
}
if ($captureContract.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity capture owner: $($captureContract.ownerRepo)"
}
if ($captureContract.runtimeId -ne "unity-uitoolkit") {
  throw "Unexpected EveUnity capture runtime: $($captureContract.runtimeId)"
}
if ($captureContract.targetId -ne "unity-uitoolkit") {
  throw "Unexpected EveUnity capture target: $($captureContract.targetId)"
}
if ($captureContract.requestSchema -ne "gamecult.eve.runtime_capture_request.v1") {
  throw "Unexpected EveUnity capture request schema: $($captureContract.requestSchema)"
}

$builderPath = Join-Path $projectRoot $captureContract.requestBuilder
if (-not (Test-Path -LiteralPath $builderPath)) {
  throw "EveUnity capture request builder not found: $($captureContract.requestBuilder)"
}
if ((Join-Path $projectRoot $captureContract.advertisementPath) -ne $absoluteAdvertisementPath) {
  throw "EveUnity capture advertisement path mismatch: $($captureContract.advertisementPath) vs $AdvertisementPath"
}

node --test (Join-Path $projectRoot "tools\eveunity\eveunity-capture-contract.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity capture contract tests failed with exit code $LASTEXITCODE"
}

node $builderPath --capability $absoluteCapabilityPath --advertisement $absoluteAdvertisementPath --output $absoluteOutputPath --stamp $Stamp
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity capture request builder failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $absoluteOutputPath)) {
  throw "EveUnity capture request was not written: $absoluteOutputPath"
}

$request = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.runtime_capture_request.v1" },
  @{ field = "runtimeId"; value = "unity-uitoolkit" },
  @{ field = "ownerRepo"; value = "EveUnity" },
  @{ field = "providerId"; value = "aetheria" },
  @{ field = "surfaceId"; value = "aetheria.daemon.game" },
  @{ field = "targetId"; value = "unity-uitoolkit" },
  @{ field = "commandBoundary"; value = "aetheria.daemon.commands" },
  @{ field = "receiptSchema"; value = "aetheria.eve_command_acceptance_status.v1" },
  @{ field = "captureKind"; value = "unity-editor-or-batchmode-png" },
  @{ field = "artifactKind"; value = "png" },
  @{ field = "conformanceAttachment"; value = "runtime.captureArtifacts[]" }
)) {
  if ($request.($expectation.field) -ne $expectation.value) {
    throw "EveUnity capture request $($expectation.field) expected $($expectation.value) got $($request.($expectation.field))"
  }
}
if ($request.artifactPath -ne "artifacts/eveunity-uitoolkit-capture/$Stamp/unity-uitoolkit.png") {
  throw "Unexpected EveUnity capture artifact path: $($request.artifactPath)"
}

Write-Host "EveUnity capture contract smoke passed: $absoluteOutputPath"
