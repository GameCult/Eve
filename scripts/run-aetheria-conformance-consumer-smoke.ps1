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
    --expect-schema gamecult.eve.provider_handoff.v1 `
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
    --expect-interactive-world-surface aetheria:aetheria.daemon.game:electron-shell:Aetheria `
    --expect-interactive-world-surface aetheria:aetheria.daemon.game:tui:Aetheria `
    --expect-interactive-world-surface aetheria:aetheria.daemon.editor:unity-uitoolkit:Aetheria `
    --expect-interactive-world-surface aetheria:aetheria.daemon.editor:electron-shell:Aetheria `
    --expect-interactive-world-surface aetheria:aetheria.daemon.editor:tui:Aetheria `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-scene:claimed:EveUnity:unity-scene `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:tui:claimed:EveTui:tui `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:tui:claimed:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-scene:covered:EveUnity:unity-scene `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:tui:covered:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:tui:covered:EveTui:tui `
    --expect-runtime-capture-artifact unity-uitoolkit:json-projection:gamecult.eve.unity_uitoolkit_projection.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact unity-scene:json-projection:gamecult.eve.unity_scene_projection.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact electron-shell:json-projection:gamecult.eve.electron_shell_projection.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact tui:json-grid:gamecult.eve.tui_grid.v1:aetheria:aetheria.daemon.game `
    --expect-split-handoff-move EveTui:tui:tui-runtime-body:current:exists:eve-tui-shell.mjs `
    --expect-split-handoff-move EveTui:tui:tui-world-surface-lowering:current:exists:eve-tui-shell.mjs `
    --expect-split-handoff-move EveTui:tui:tui-command-transport:current:exists:eve-tui-shell.mjs `
    --expect-split-target-blocker "EveUnity:Unity scene runtime body graduates to EveUnity outside Aetheria product code" `
    --expect-split-target-blocker "EveElectron:Electron shell runtime body graduates to EveElectron outside Aetheria product code" `
    --expect-split-target-blocker "EveTui:TUI package release is cut from EveTui rather than Eve incubation" `
    --expect-split-target-blocker "EveTui:TUI capture path is owned by EveTui rather than Eve incubation" `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-runtime-body:current:exists:EveUnitySceneSurfaceLowerer.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-world-surface-lowering:current:exists:EveUnitySceneSurfaceLowerer.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-command-transport:current:exists:EveUnitySceneSurfaceLowerer.cs `
    --expect-split-handoff-move EveUnity:unity-uitoolkit:aetheria-unity-consumer-boundary:observed-provider:exists:Packages/manifest.json `
    --expect-split-handoff-move EveUnity:unity-uitoolkit:aetheria-unity-consumer-boundary:observed-provider:exists:GameCult.Eve.UnityUIToolkit.csproj `
    --expect-split-handoff-move EveUnity:unity-uitoolkit:aetheria-unity-consumer-boundary:observed-provider:exists:Aetheria.State.Unity/AetheriaRuntimeCatalogClient.cs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-shell-runtime:current:exists:eve-electron-shell.mjs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-command-transport:current:exists:eve-electron-shell.mjs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-world-surface-lowering:current:exists:eve-electron-shell.mjs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-shell-runtime:observed-provider:exists:Aetheria.Rts.Web/Electron `
    --expect-split-handoff-move EveElectron:electron-shell:electron-command-transport:observed-provider:exists:Aetheria.Rts.Web/Client/app.ts `
    --expect-split-handoff-move EveElectron:electron-shell:electron-world-surface-lowering:observed-provider:exists:Aetheria.Rts.Web/Client `
    --expect-provider-command aetheria:aetheria.daemon.commands `
    --expect-provider-receipt-state aetheria:accepted `
    --expect-provider-receipt-state aetheria:pending `
    --expect-provider-receipt-state aetheria:reconciled `
    --expect-provider-handoff aetheria `
    --expect-provider-handoff-move aetheria:provider-advertisement:current:exists:aetheria.provider-advertisement.json `
    --expect-provider-handoff-move aetheria:interactive-world-surface:current:exists:aetheria-world-surface.json `
    --expect-provider-handoff-move aetheria:interactive-world-surface:current:exists:aetheria-world-surface.conformance.json `
    --expect-provider-handoff-move aetheria:provider-scenario:current:exists:aetheria-world-scenario.json `
    --expect-provider-handoff-move aetheria:provider-scenario:current:exists:run-aetheria-conformance-consumer-smoke.ps1
  if ($LASTEXITCODE -ne 0) {
    throw "Aetheria conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
