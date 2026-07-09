param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-electron\eve-runtime-capability.json",
  [string] $OutputPath = "artifacts\eveelectron-release-contract\latest\release-request.json"
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
  throw "EveElectron release contract input not found: $absoluteCapabilityPath"
}

$manifest = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json
$releaseContract = $manifest.lifecycle.release.releaseContract
if ($null -eq $releaseContract) {
  throw "EveElectron release contract missing lifecycle.release.releaseContract"
}
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "requestSchema", "requestBuilder", "artifactPattern", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveElectron release contract missing $field"
  }
}
if ($releaseContract.ownerRepo -ne "EveElectron") {
  throw "Unexpected EveElectron release owner: $($releaseContract.ownerRepo)"
}
if ($releaseContract.packageName -ne "eve-electron") {
  throw "Unexpected EveElectron package name: $($releaseContract.packageName)"
}
if ($releaseContract.requestSchema -ne "gamecult.eve.runtime_release_request.v1") {
  throw "Unexpected EveElectron release request schema: $($releaseContract.requestSchema)"
}
if ($releaseContract.artifactKind -ne "electron-app") {
  throw "Unexpected EveElectron release artifact kind: $($releaseContract.artifactKind)"
}

$builderPath = Join-Path $projectRoot $releaseContract.requestBuilder
$packagePath = Join-Path $projectRoot $releaseContract.versionSource
$packageRoot = Join-Path $projectRoot $releaseContract.packageRoot
foreach ($path in @($builderPath, $packagePath, $packageRoot)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveElectron release contract path not found: $path"
  }
}

node --test (Join-Path $projectRoot "tools\eveelectron\eveelectron-release-contract.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveElectron release contract tests failed with exit code $LASTEXITCODE"
}

node $builderPath --capability $absoluteCapabilityPath --package $packagePath --output $absoluteOutputPath
if ($LASTEXITCODE -ne 0) {
  throw "EveElectron release request builder failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $absoluteOutputPath)) {
  throw "EveElectron release request was not written: $absoluteOutputPath"
}

$request = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
$packageManifest = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.runtime_release_request.v1" },
  @{ field = "ownerRepo"; value = "EveElectron" },
  @{ field = "repository"; value = "GameCult/EveElectron" },
  @{ field = "packageName"; value = "eve-electron" },
  @{ field = "version"; value = $packageManifest.version },
  @{ field = "packageRoot"; value = "runtimes/incubating/eve-electron" },
  @{ field = "versionSource"; value = "runtimes/incubating/eve-electron/package.json" },
  @{ field = "artifactKind"; value = "electron-app" }
)) {
  if ($request.($expectation.field) -ne $expectation.value) {
    throw "EveElectron release request $($expectation.field) expected $($expectation.value) got $($request.($expectation.field))"
  }
}

$expectedTagName = $releaseContract.tagPattern.Replace("{version}", $packageManifest.version)
if ($request.tagName -ne $expectedTagName) {
  throw "Unexpected EveElectron release tag: $($request.tagName)"
}
$expectedArtifactPath = $releaseContract.artifactPattern.Replace("{version}", $packageManifest.version)
if ($request.artifactPath -ne $expectedArtifactPath) {
  throw "Unexpected EveElectron release artifact path: $($request.artifactPath)"
}
if ($request.main -ne $packageManifest.main) {
  throw "EveElectron release request lost package main entry"
}

Write-Host "EveElectron release contract smoke passed: $absoluteOutputPath"
