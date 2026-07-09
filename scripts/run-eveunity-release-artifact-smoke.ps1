param(
  [string] $CapabilityManifestPath = "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json",
  [string] $RequestOutputPath = "artifacts\eveunity-uitoolkit-release-contract\latest\release-request.json",
  [string] $ProofOutputPath = "artifacts\eveunity-uitoolkit-release\latest\release-artifact.json",
  [string] $ReleaseContractSmokePath = "scripts\run-eveunity-release-contract-smoke.ps1"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteCapabilityPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}
$absoluteRequestOutputPath = if ([System.IO.Path]::IsPathRooted($RequestOutputPath)) {
  $RequestOutputPath
} else {
  Join-Path $projectRoot $RequestOutputPath
}
$absoluteProofOutputPath = if ([System.IO.Path]::IsPathRooted($ProofOutputPath)) {
  $ProofOutputPath
} else {
  Join-Path $projectRoot $ProofOutputPath
}

if (-not (Test-Path -LiteralPath $absoluteCapabilityPath)) {
  throw "EveUnity release artifact input not found: $absoluteCapabilityPath"
}

$manifest = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json
$releaseContract = $manifest.lifecycle.release.releaseContract
if ($null -eq $releaseContract) {
  throw "EveUnity release artifact smoke missing lifecycle.release.releaseContract"
}
if ($releaseContract.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity release artifact owner: $($releaseContract.ownerRepo)"
}
if ($releaseContract.artifactKind -ne "upm-package") {
  throw "Unexpected EveUnity release artifact kind: $($releaseContract.artifactKind)"
}
if (-not $releaseContract.artifactBuilder) {
  throw "EveUnity release contract missing artifactBuilder"
}
$artifactBuilderPath = Join-Path $projectRoot $releaseContract.artifactBuilder
if (-not (Test-Path -LiteralPath $artifactBuilderPath)) {
  throw "EveUnity release artifact builder not found: $($releaseContract.artifactBuilder)"
}
$releaseContractSmoke = if ([System.IO.Path]::IsPathRooted($ReleaseContractSmokePath)) {
  $ReleaseContractSmokePath
} else {
  Join-Path $projectRoot $ReleaseContractSmokePath
}
if (-not (Test-Path -LiteralPath $releaseContractSmoke)) {
  throw "EveUnity release contract smoke not found: $ReleaseContractSmokePath"
}

node --test (Join-Path $projectRoot "tools\eveunity\eveunity-release-artifact.test.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity release artifact tests failed with exit code $LASTEXITCODE"
}

& $releaseContractSmoke `
  -CapabilityManifestPath $CapabilityManifestPath `
  -OutputPath $RequestOutputPath
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity release contract smoke failed with exit code $LASTEXITCODE"
}

node $artifactBuilderPath `
  --project-root $projectRoot `
  --request $RequestOutputPath `
  --proof-output $ProofOutputPath
if ($LASTEXITCODE -ne 0) {
  throw "EveUnity release artifact builder failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path -LiteralPath $absoluteProofOutputPath)) {
  throw "EveUnity release artifact proof was not written: $absoluteProofOutputPath"
}

$proof = Get-Content -LiteralPath $absoluteProofOutputPath -Raw | ConvertFrom-Json
foreach ($expectation in @(
  @{ field = "schema"; value = "gamecult.eve.runtime_release_artifact.v1" },
  @{ field = "ownerRepo"; value = "EveUnity" },
  @{ field = "repository"; value = "GameCult/EveUnity" },
  @{ field = "packageName"; value = $releaseContract.packageName },
  @{ field = "artifactKind"; value = "upm-package" }
)) {
  if ($proof.($expectation.field) -ne $expectation.value) {
    throw "EveUnity release artifact proof $($expectation.field) expected $($expectation.value) got $($proof.($expectation.field))"
  }
}
if ($proof.artifactSizeBytes -le 0) {
  throw "EveUnity release artifact proof has invalid size: $($proof.artifactSizeBytes)"
}

$artifactPath = if ([System.IO.Path]::IsPathRooted($proof.artifactPath)) {
  $proof.artifactPath
} else {
  Join-Path $projectRoot $proof.artifactPath
}
if (-not (Test-Path -LiteralPath $artifactPath)) {
  throw "EveUnity release artifact was not written: $artifactPath"
}

Write-Host "EveUnity release artifact smoke passed: $artifactPath"
