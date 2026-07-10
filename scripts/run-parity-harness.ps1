param(
  [string] $OutputDirectory = "artifacts\parity"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$conformanceRoot = if ($env:EVE_CONFORMANCE_ROOT) { $env:EVE_CONFORMANCE_ROOT } else { "E:\Projects\EveConformance" }
if (-not (Test-Path (Join-Path $conformanceRoot "tools\parity\run-parity.mjs"))) {
  throw "EveConformance checkout not found: $conformanceRoot"
}
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
  & (Join-Path $PSScriptRoot "run-web-reference-layout-probe-smoke.ps1") `
    -ProviderId "eve.world-smoke" `
    -FixtureId "eve-world-smoke" `
    -OutputPath "artifacts\web-reference-layout-probe\latest\eve-world-smoke.json" `
    -Port 8894 `
    -SkipBuild
  & (Join-Path $PSScriptRoot "run-eveunity-owner-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-eveplugins-owner-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-eveflutter-owner-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-evetui-capture-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-evetui-capture-smoke.ps1") `
    -AdvertisementPath "web\fixtures\eve-world-smoke.provider-advertisement.json" `
    -SurfacePath "web\fixtures\eve-world-smoke-surface.json" `
    -OutputPath "artifacts\evetui-capture\latest\eve-world-smoke-tui-grid.json" `
    -RequestOutputPath "artifacts\evetui-capture\latest\eve-world-smoke-capture-request.json" `
    -ExpectedProviderId "eve.world-smoke" `
    -ExpectedSurfaceId "eve.world-smoke.surface" `
    -ExpectedCommandBoundary "eve.world-smoke.commands" `
    -ExpectedReceiptSchema "eve.world_smoke.command_receipt.v1"
  $env:EVE_KERNEL_ROOT = $projectRoot
  $env:EVE_CONFORMANCE_OUTPUT = Join-Path $projectRoot "artifacts\conformance"
  node (Join-Path $conformanceRoot "tools\parity\run-parity.mjs")
  node (Join-Path $conformanceRoot "tools\conformance\attach-runtime-witness.mjs") `
    "E:\Projects\EveElectron\artifacts\capture\generic-world\runtime-witness.json" `
    ".\artifacts\conformance\latest"
  node (Join-Path $conformanceRoot "tools\conformance\attach-runtime-witness.mjs") `
    "E:\Projects\EveElectron\artifacts\capture\aetheria-world\runtime-witness.json" `
    ".\artifacts\conformance\latest"
  node (Join-Path $conformanceRoot "tools\conformance\attach-plugin-witness.mjs") `
    "E:\Projects\EvePlugins\artifacts\tex-math\runtime-witness.json" `
    ".\artifacts\conformance\latest"
  & (Join-Path $PSScriptRoot "run-eveelectron-owner-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-evetui-split-handoff-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-evetui-lifecycle-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-plugin-owner-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-runtime-owner-conformance-consumer-smoke.ps1")
  & (Join-Path $PSScriptRoot "run-split-target-conformance-consumer-smoke.ps1")
} finally {
  Pop-Location
}
