param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-electron\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveElectron runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "electron-shell") {
  throw "Unexpected EveElectron runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "pending-provider-advertisement-shell-smoke") {
  throw "EveElectron provider shell smoke should remain pending until a generic shell body exists: $($manifest.lifecycle.test.status)"
}

throw "EveElectron provider shell smoke is a pending contract, not a runnable proof, until EveElectron owns the provider-agnostic Electron shell body."
