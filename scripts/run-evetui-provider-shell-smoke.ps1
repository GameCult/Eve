param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-tui\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveTui runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "tui") {
  throw "Unexpected EveTui runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "pending-provider-advertisement-tui-smoke") {
  throw "EveTui provider shell smoke should remain pending until a generic TUI body exists: $($manifest.lifecycle.test.status)"
}

throw "EveTui provider shell smoke is a pending contract, not a runnable proof, until EveTui owns the provider-agnostic terminal/grid lowerer."
