param(
  [string] $ExportDirectory = "artifacts\conformance\latest",
  [string] $AetheriaRoot = "E:\Projects\Aetheria",
  [string] $ConsumerDirectory = "artifacts\aetheria-conformance-consumer-smoke"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceExport = if ([System.IO.Path]::IsPathRooted($ExportDirectory)) {
  $ExportDirectory
} else {
  Join-Path $projectRoot $ExportDirectory
}
$consumerRoot = if ([System.IO.Path]::IsPathRooted($ConsumerDirectory)) {
  $ConsumerDirectory
} else {
  Join-Path $projectRoot $ConsumerDirectory
}
$consumerExport = Join-Path $consumerRoot "export"

if (-not (Test-Path $sourceExport)) {
  throw "Conformance export not found: $sourceExport"
}
if (-not (Test-Path $AetheriaRoot)) {
  throw "Aetheria repo not found: $AetheriaRoot"
}

if (Test-Path $consumerExport) {
  Remove-Item -LiteralPath $consumerExport -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $consumerRoot | Out-Null
Copy-Item -LiteralPath $sourceExport -Destination $consumerExport -Recurse

$consumerScript = Join-Path $projectRoot "tools\conformance\consume-export.mjs"

Push-Location $AetheriaRoot
try {
  node $consumerScript $consumerExport `
    --expect-pack provider `
    --expect-fixture aetheria-world `
    --expect-provider aetheria `
    --expect-scenario aetheria-world-command-replay `
    --expect-provider-surface aetheria:aetheria.daemon.game `
    --expect-provider-surface aetheria:aetheria.daemon.editor `
    --expect-provider-surface-kind aetheria:aetheria.daemon.game:interactive-world `
    --expect-provider-surface-kind aetheria:aetheria.daemon.editor:interactive-world-editor `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.projectionKind:provider-authored-world-surface `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.commandBoundary:aetheria.daemon.commands `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.receiptSchema:aetheria.eve_command_acceptance_status.v1 `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.ownership:provider-owns-world-state-assets-command-acceptance-and-receipts `
    --expect-provider-surface-field aetheria:aetheria.daemon.editor:worldInteraction.projectionKind:provider-authored-world-editor-surface `
    --expect-provider-surface-field aetheria:aetheria.daemon.editor:worldInteraction.commandBoundary:aetheria.daemon.commands `
    --expect-provider-surface-field aetheria:aetheria.daemon.editor:worldInteraction.receiptSchema:aetheria.eve_command_acceptance_status.v1 `
    --expect-provider-surface-field aetheria:aetheria.daemon.editor:worldInteraction.ownership:provider-owns-editor-state-assets-command-acceptance-and-receipts `
    --expect-interactive-world-surface aetheria:aetheria.daemon.game:web-reference:Aetheria `
    --expect-interactive-world-surface aetheria:aetheria.daemon.game:unity-scene:Aetheria `
    --expect-interactive-world-surface aetheria:aetheria.daemon.editor:unity-uitoolkit:Aetheria `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-scene:missing-claim:EveUnity:unity-scene `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:tui:missing-claim:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-scene:missing-runtime-claim:EveUnity:unity-scene `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:tui:missing-runtime-claim:EveTui:tui `
    --expect-world-lowering-gap aetheria:aetheria.daemon.game:unity-scene:EveUnity:unity-scene `
    --expect-world-lowering-gap aetheria:aetheria.daemon.editor:tui:EveTui:tui `
    --expect-split-target-blocker "EveUnity:Unity scene runtime body exists outside Aetheria product code" `
    --expect-split-target-blocker "EveElectron:Electron shell runtime body exists outside Aetheria product code" `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-runtime-body:replacement-required:no-source-paths:none `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-command-transport:replacement-required:no-source-paths:none `
    --expect-split-handoff-move EveElectron:electron-shell:electron-shell-runtime:observed-provider:exists:Aetheria.Rts.Web/Electron `
    --expect-split-handoff-move EveElectron:electron-shell:electron-command-transport:observed-provider:exists:Aetheria.Rts.Web/Client/app.ts `
    --expect-provider-command aetheria:aetheria.daemon.commands `
    --expect-provider-receipt-state aetheria:accepted `
    --expect-provider-receipt-state aetheria:pending `
    --expect-provider-receipt-state aetheria:reconciled `
    --expect-provider-handoff aetheria
  if ($LASTEXITCODE -ne 0) {
    throw "Aetheria conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
