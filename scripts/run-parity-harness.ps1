param(
  [string] $OutputDirectory = "artifacts\parity"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$env:EVE_PARITY_OUTPUT = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
  $OutputDirectory
} else {
  Join-Path $projectRoot $OutputDirectory
}

Push-Location $projectRoot
try {
  node .\tools\parity\run-parity.mjs
  & (Join-Path $PSScriptRoot "run-eveunity-split-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-plugin-owner-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-runtime-owner-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-split-target-conformance-consumer-smoke.ps1")
} finally {
  Pop-Location
}
