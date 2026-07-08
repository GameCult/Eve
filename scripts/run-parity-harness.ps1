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
  & (Join-Path $PSScriptRoot "run-conformance-consumer-smoke.ps1")
} finally {
  Pop-Location
}
