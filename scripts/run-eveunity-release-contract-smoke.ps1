param(
  [string] $CapabilityManifestPath = "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json",
  [string] $OutputPath = "artifacts\eveunity-uitoolkit-release-contract\latest\release-request.json"
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
  throw "EveUnity release contract input not found: $absoluteCapabilityPath"
}

$manifest = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json
$releaseContract = $manifest.lifecycle.release.releaseContract
if ($null -eq $releaseContract) {
  throw "EveUnity release contract missing lifecycle.release.releaseContract"
}
foreach ($field in @("ownerRepo", "packageName", "packageRoot", "versionSource", "tagPattern", "artifactKind", "requestSchema", "requestBuilder", "artifactPattern", "publishProof")) {
  if (-not $releaseContract.$field) {
    throw "EveUnity release contract missing $field"
  }
}
if ($releaseContract.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity release owner: $($releaseContract.ownerRepo)"
}
if ($releaseContract.requestSchema -ne "gamecult.eve.runtime_release_request.v1") {
  throw "Unexpected EveUnity release request schema: $($releaseContract.requestSchema)"
}
if ($releaseContract.artifactKind -ne "upm-package") {
  throw "Unexpected EveUnity release artifact kind: $($releaseContract.artifactKind)"
}

$builderPath = Join-Path $projectRoot $releaseContract.requestBuilder
$packagePath = Join-Path $projectRoot $releaseContract.versionSource
$packageRoot = Join-Path $projectRoot $releaseContract.packageRoot
foreach ($path in @($builderPath, $packagePath, $packageRoot)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "EveUnity release contract path not found: $path"
  }
}

node --test (Join-Path $projectRoot "tools\eveunity\eveunity-release-contract.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity release contract tests failed with exit code $LASTEXITCODE"
}

node $builderPath --capability $absoluteCapabilityPath --package $packagePath --output $absoluteOutputPath
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity release request builder failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path -LiteralPath $absoluteOutputPath)) {
  throw "EveUnity release request was not written: $absoluteOutputPath"
}

$request = Get-Content -LiteralPath $absoluteOutputPath -Raw | ConvertFrom-Json
$packageManifest = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.runtime_release_request.v1" },
  @{ field = "ownerRepo"; value = "EveUnity" },
  @{ field = "repository"; value = "GameCult/EveUnity" },
  @{ field = "packageName"; value = "org.gamecult.eve.unity-uitoolkit" },
  @{ field = "version"; value = $packageManifest.version },
  @{ field = "packageRoot"; value = "packages/org.gamecult.eve.unity-uitoolkit" },
  @{ field = "versionSource"; value = "packages/org.gamecult.eve.unity-uitoolkit/package.json" },
  @{ field = "artifactKind"; value = "upm-package" }
)) {
  if ($request.($expectation.field) -ne $expectation.value) {
    throw "EveUnity release request $($expectation.field) expected $($expectation.value) got $($request.($expectation.field))"
  }
}

$expectedTagName = $releaseContract.tagPattern.Replace("{version}", $packageManifest.version)
if ($request.tagName -ne $expectedTagName) {
  throw "Unexpected EveUnity release tag: $($request.tagName)"
}
$expectedArtifactPath = $releaseContract.artifactPattern.Replace("{version}", $packageManifest.version)
if ($request.artifactPath -ne $expectedArtifactPath) {
  throw "Unexpected EveUnity release artifact path: $($request.artifactPath)"
}
if ($request.dependencies."org.gamecult.eve.surface" -ne $packageManifest.dependencies."org.gamecult.eve.surface") {
  throw "EveUnity release request lost org.gamecult.eve.surface dependency"
}
$surfaceDependency = @($request.requiredPackageDependencies) | Where-Object { $_.packageName -eq "org.gamecult.eve.surface" } | Select-Object -First 1
if (-not $surfaceDependency) {
  throw "EveUnity release request missing required org.gamecult.eve.surface dependency contract"
}
if ($surfaceDependency.ownerRepo -ne "Eve" -or $surfaceDependency.packageManager -ne "upm") {
  throw "EveUnity release request has unexpected surface dependency owner/package manager: $($surfaceDependency.ownerRepo)/$($surfaceDependency.packageManager)"
}
if ($surfaceDependency.version -ne $packageManifest.dependencies."org.gamecult.eve.surface") {
  throw "EveUnity release request surface dependency version mismatch: $($surfaceDependency.version)"
}

Write-Host "EveUnity release contract smoke passed: $absoluteOutputPath"
