param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-tui\eve-runtime-capability.json",
  [string] $OutputPath = "artifacts\evetui-release-contract\latest\release-request.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteCapabilityPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}
$absoluteOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path $projectRoot $OutputPath
}

if (-not (Test-Path -LiteralPath $absoluteCapabilityPath)) {
  throw "EveTui release contract input not found: $absoluteCapabilityPath"
}

$manifest = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json
$releaseContract = $manifest.lifecycle.release.releaseContract
if ($null -eq $releaseContract) {
  throw "EveTui release contract missing lifecycle.release.releaseContract"
}
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "requestSchema", "requestBuilder", "artifactPattern", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveTui release contract missing $field"
  }
}
if ($releaseContract.ownerRepo -ne "EveTui") {
  throw "Unexpected EveTui release owner: $($releaseContract.ownerRepo)"
}
if ($releaseContract.packageName -ne "eve-tui") {
  throw "Unexpected EveTui package name: $($releaseContract.packageName)"
}
if ($releaseContract.requestSchema -ne "gamecult.eve.runtime_release_request.v1") {
  throw "Unexpected EveTui release request schema: $($releaseContract.requestSchema)"
}
if ($releaseContract.artifactKind -ne "terminal-runtime") {
  throw "Unexpected EveTui release artifact kind: $($releaseContract.artifactKind)"
}

$builderPath = Join-Path $projectRoot $releaseContract.requestBuilder
$packagePath = Join-Path $projectRoot $releaseContract.versionSource
$packageRoot = Join-Path $projectRoot $releaseContract.packageRoot
foreach ($path in @($builderPath, $packagePath, $packageRoot)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveTui release contract path not found: $path"
  }
}

node --test (Join-Path $projectRoot "tools\evetui\evetui-release-contract.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveTui release contract tests failed with exit code $LASTEXITCODE"
}

node $builderPath --capability $absoluteCapabilityPath --package $packagePath --output $absoluteOutputPath
if ($LASTEXITCODE -ne 0) {
  throw "EveTui release request builder failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $absoluteOutputPath)) {
  throw "EveTui release request was not written: $absoluteOutputPath"
}

$request = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
$packageManifest = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.runtime_release_request.v1" },
  @{ field = "ownerRepo"; value = "EveTui" },
  @{ field = "repository"; value = "GameCult/EveTui" },
  @{ field = "packageName"; value = "eve-tui" },
  @{ field = "version"; value = $packageManifest.version },
  @{ field = "packageRoot"; value = "runtimes/incubating/eve-tui" },
  @{ field = "versionSource"; value = "runtimes/incubating/eve-tui/package.json" },
  @{ field = "artifactKind"; value = "terminal-runtime" }
)) {
  if ($request.($expectation.field) -ne $expectation.value) {
    throw "EveTui release request $($expectation.field) expected $($expectation.value) got $($request.($expectation.field))"
  }
}

$expectedTagName = $releaseContract.tagPattern.Replace("{version}", $packageManifest.version)
if ($request.tagName -ne $expectedTagName) {
  throw "Unexpected EveTui release tag: $($request.tagName)"
}
$expectedArtifactPath = $releaseContract.artifactPattern.Replace("{version}", $packageManifest.version)
if ($request.artifactPath -ne $expectedArtifactPath) {
  throw "Unexpected EveTui release artifact path: $($request.artifactPath)"
}
if ($request.main -ne $packageManifest.main) {
  throw "EveTui release request lost package main entry"
}

Write-Host "EveTui release contract smoke passed: $absoluteOutputPath"
