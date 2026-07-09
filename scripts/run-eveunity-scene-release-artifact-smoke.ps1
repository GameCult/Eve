param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-unity-scene\eve-runtime-capability.json",
  [string] $RequestOutputPath = "artifacts\eveunity-scene-release-contract\latest\release-request.json",
  [string] $ProofOutputPath = "artifacts\eveunity-scene-release\latest\release-artifact.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
& (Join-Path $projectRoot "scripts\run-eveunity-release-artifact-smoke.ps1") `
  -CapabilityManifestPath $CapabilityManifestPath `
  -RequestOutputPath $RequestOutputPath `
  -ProofOutputPath $ProofOutputPath `
  -ReleaseContractSmokePath "scripts\run-eveunity-scene-release-contract-smoke.ps1"

if ($LASTEXITCODE -ne 0) {
  throw "EveUnity scene release artifact smoke failed with exit code $LASTEXITCODE"
}
