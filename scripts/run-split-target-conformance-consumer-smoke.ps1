param(
  [string] $SourceDirectory = "artifacts\conformance\latest",
  [string] $SmokeDirectory = "artifacts\split-target-conformance-consumer-smoke"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$conformanceRoot = if ($env:EVE_CONFORMANCE_ROOT) { $env:EVE_CONFORMANCE_ROOT } else { "E:\Projects\EveConformance" }
$consumerScript = Join-Path $conformanceRoot "tools\conformance\consume-export.mjs"
$sourcePath = if ([System.IO.Path]::IsPathRooted($SourceDirectory)) {
  $SourceDirectory
} else {
  Join-Path $projectRoot $SourceDirectory
}
$smokePath = if ([System.IO.Path]::IsPathRooted($SmokeDirectory)) {
  $SmokeDirectory
} else {
  Join-Path $projectRoot $SmokeDirectory
}
$exportPath = Join-Path $smokePath "export"

if (-not (Test-Path -LiteralPath (Join-Path $sourcePath "index.json"))) {
  throw "Conformance export not found: $sourcePath"
}

if (Test-Path -LiteralPath $exportPath) {
  Remove-Item -LiteralPath $exportPath -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $smokePath | Out-Null
Copy-Item -LiteralPath $sourcePath -Destination $exportPath -Recurse

Push-Location $projectRoot
try {
  node $consumerScript $exportPath `
    --expect-split-target EveFlutter `
    --expect-split-target-status EveFlutter:graduated `
    --expect-split-target-proof "EveFlutter:Provider picker consumes provider advertisements" `
    --expect-split-target-proof "EveFlutter:Conformance pack can be consumed" `
    --expect-split-target-proof "EveFlutter:Flutter lifecycle, owner CI, tagged release, and capture evidence" `
    --expect-split-target EveUnity `
    --expect-split-target-status EveUnity:graduated `
    --expect-split-target-proof "EveUnity:Unity UI Toolkit package lifecycle is owned and tested from EveUnity" `
    --expect-split-target-proof "EveUnity:Aetheria consumes tagged Unity packages released by EveUnity" `
    --expect-split-target-proof "EveUnity:Unity scene runtime is owned by EveUnity" `
    --expect-split-target-proof "EveUnity:Unity scene lifecycle is owned and tested from EveUnity" `
    --expect-split-target-proof "EveUnity:Aetheria daemon 3D ARPG world lowers through a generic EveUnity playable-world client" `
    --expect-split-target EveElectron `
    --expect-split-target-status EveElectron:graduated `
    --expect-split-target-proof "EveElectron:EveElectron owner repository publishes the generic runtime package" `
    --expect-split-target-proof "EveElectron:EveElectron owns secure window, preload, and generic CultMesh asset lifecycle" `
    --expect-split-target EveTui `
    --expect-split-target-status EveTui:graduated `
    --expect-split-target-proof "EveTui:EveTui owns a tagged package and runtime lifecycle" `
    --expect-split-target-proof "EveTui:EveTui lifecycle contract is machine-readable" `
    --expect-runtime-capture-artifact tui:json-grid:gamecult.eve.tui_grid.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact tui:json-grid:gamecult.eve.tui_grid.v1:eve.world-smoke:eve.world-smoke.surface
  if ($LASTEXITCODE -ne 0) {
    throw "Split target conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "Split target conformance consumer smoke passed: $exportPath"
