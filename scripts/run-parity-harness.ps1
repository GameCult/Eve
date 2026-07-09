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
  & (Join-Path $PSScriptRoot "run-web-reference-layout-probe-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-web-reference-layout-probe-smoke.ps1") `
    -ProviderId "gamecult.home.vn" `
    -FixtureId "sai-vn" `
    -OutputPath "artifacts\web-reference-layout-probe\latest\sai-vn.json" `
    -Port 8893 `
    -SkipBuild
  & (Join-Path $PSScriptRoot "run-eveunity-uitoolkit-capture-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-evetui-capture-smoke.ps1")
  node .\tools\parity\run-parity.mjs
  & (Join-Path $PSScriptRoot "run-eveconformance-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-plugin-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-aetheria-provider-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-eveunity-split-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-eveunity-scene-split-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-eveunity-scene-lifecycle-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-eveelectron-split-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-eveelectron-lifecycle-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-evetui-split-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-evetui-lifecycle-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-plugin-owner-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-runtime-owner-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-split-target-conformance-consumer-smoke.ps1")
} finally {
  Pop-Location
}
