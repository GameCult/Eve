param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-unity-scene\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveUnity scene runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "unity-scene") {
  throw "Unexpected EveUnity scene runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "pending-provider-advertisement-scene-smoke") {
  throw "EveUnity scene provider shell smoke should remain pending until a generic scene body exists: $($manifest.lifecycle.test.status)"
}

throw "EveUnity scene provider shell smoke is a pending contract, not a runnable proof, until EveUnity owns the provider-agnostic Unity scene lowerer."
