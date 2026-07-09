param(
  [string] $SourceDirectory = "artifacts\conformance\latest",
  [string] $SmokeDirectory = "artifacts\split-target-conformance-consumer-smoke"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
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
  node .\tools\conformance\consume-export.mjs $exportPath `
    --expect-split-target EveFlutter `
    --expect-split-target-status EveFlutter:incubating `
    --expect-split-target-proof "EveFlutter:Provider picker consumes provider advertisements" `
    --expect-split-target-proof "EveFlutter:Conformance pack can be consumed" `
    --expect-split-target-proof "EveFlutter:Flutter lifecycle evidence is declared" `
    --expect-split-target-blocker "EveFlutter:Tagged EveFlutter release" `
    --expect-split-target EveUnity `
    --expect-split-target-status EveUnity:incubating `
    --expect-split-target-proof "EveUnity:Unity lifecycle evidence is declared" `
    --expect-split-target-proof "EveUnity:EveUnity split handoff is machine-readable" `
    --expect-split-target-proof "EveUnity:Unity scene split handoff is machine-readable" `
    --expect-split-target-proof "EveUnity:Unity scene lifecycle contract is machine-readable" `
    --expect-runtime-capture-artifact unity-uitoolkit:json-projection:gamecult.eve.unity_uitoolkit_projection.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact unity-uitoolkit:json-projection:gamecult.eve.unity_uitoolkit_projection.v1:eve.world-smoke:eve.world-smoke.surface `
    --expect-runtime-capture-artifact unity-scene:json-projection:gamecult.eve.unity_scene_projection.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact unity-scene:json-projection:gamecult.eve.unity_scene_projection.v1:eve.world-smoke:eve.world-smoke.surface `
    --expect-split-target-blocker "EveUnity:runtime:unity-scene:status:pending" `
    --expect-split-target-blocker-record EveUnity:runtime-status:unity-scene `
    --expect-split-target-blocker-record "EveUnity:pending-proof:Unity scene runtime body graduates to EveUnity outside Aetheria product code." `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-runtime-body:current:exists:EveUnitySceneSurfaceLowerer.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-runtime-body:current:exists:EveUnityPlayableWorldClientBootstrap.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-upm-package:current:exists:eveunity-release-artifact.mjs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-world-surface-lowering:current:exists:EveUnitySceneSurfaceLowerer.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-world-surface-lowering:current:exists:EveUnityPlayableWorldClientBootstrap.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-sai-plugin-projection:current:exists:SaiVisualNovelUnitySceneProjectionAdapter.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-norn-plugin-projection:current:exists:NornGraphUnitySceneProjectionAdapter.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-tex-plugin-projection:current:exists:TeXMathUnitySceneProjectionAdapter.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-command-transport:current:exists:EveUnitySceneSurfaceLowerer.cs `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-capture-lifecycle:current:exists:eveunity-capture-contract.mjs `
    --expect-split-handoff-move EveUnity:unity-uitoolkit:aetheria-unity-consumer-boundary:observed-provider:exists:Packages/manifest.json `
    --expect-split-handoff-move EveUnity:unity-uitoolkit:aetheria-unity-consumer-boundary:observed-provider:exists:GameCult.Eve.UnityUIToolkit.csproj `
    --expect-split-handoff-move EveUnity:unity-uitoolkit:aetheria-unity-consumer-boundary:observed-provider:exists:Aetheria.State.Unity/AetheriaRuntimeCatalogClient.cs `
    --expect-split-target-blocker "EveUnity:Tagged UPM release" `
    --expect-split-target-blocker "EveUnity:Unity batchmode EditMode runner" `
    --expect-split-target-blocker "EveUnity:Unity batchmode or editor capture artifact" `
    --expect-split-target-blocker "EveUnity:Unity scene runtime body graduates to EveUnity outside Aetheria product code" `
    --expect-split-target EveElectron `
    --expect-split-target-status EveElectron:incubating `
    --expect-split-target-proof "EveElectron:EveElectron split handoff is machine-readable" `
    --expect-split-target-proof "EveElectron:EveElectron lifecycle contract is machine-readable" `
    --expect-runtime-capture-artifact electron-shell:json-projection:gamecult.eve.electron_shell_projection.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact electron-shell:json-projection:gamecult.eve.electron_shell_projection.v1:eve.world-smoke:eve.world-smoke.surface `
    --expect-split-target-blocker "EveElectron:runtime:electron-shell:status:pending" `
    --expect-split-target-blocker-record EveElectron:runtime-status:electron-shell `
    --expect-split-handoff-move EveElectron:electron-shell:electron-shell-runtime:current:exists:eve-electron-shell.mjs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-command-transport:current:exists:eve-electron-shell.mjs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-world-surface-lowering:current:exists:eve-electron-shell.mjs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-plugin-projection:current:exists:sai-vn-surface.json `
    --expect-split-handoff-move EveElectron:electron-shell:electron-capture-lifecycle:current:exists:eveelectron-capture-contract.mjs `
    --expect-split-handoff-move EveElectron:electron-shell:electron-shell-runtime:observed-provider:exists:Aetheria.Rts.Web/Electron `
    --expect-split-handoff-move EveElectron:electron-shell:electron-command-transport:observed-provider:exists:Aetheria.Rts.Web/Client/app.ts `
    --expect-split-handoff-move EveElectron:electron-shell:electron-world-surface-lowering:observed-provider:exists:Aetheria.Rts.Web/Client `
    --expect-split-target-blocker "EveElectron:Electron shell runtime body graduates to EveElectron outside Aetheria product code" `
    --expect-split-target EveTui `
    --expect-split-target-status EveTui:incubating `
    --expect-split-target-proof "EveTui:EveTui split handoff is machine-readable" `
    --expect-split-target-proof "EveTui:EveTui lifecycle contract is machine-readable" `
    --expect-runtime-capture-artifact tui:json-grid:gamecult.eve.tui_grid.v1:aetheria:aetheria.daemon.game `
    --expect-runtime-capture-artifact tui:json-grid:gamecult.eve.tui_grid.v1:eve.world-smoke:eve.world-smoke.surface `
    --expect-split-handoff-move EveTui:tui:tui-runtime-body:current:exists:eve-tui-shell.mjs `
    --expect-split-handoff-move EveTui:tui:tui-world-surface-lowering:current:exists:eve-tui-shell.mjs `
    --expect-split-handoff-move EveTui:tui:tui-command-transport:current:exists:eve-tui-shell.mjs `
    --expect-split-handoff-move EveTui:tui:tui-plugin-projection:current:exists:sai-vn-surface.json `
    --expect-split-handoff-move EveTui:tui:tui-capture-lifecycle:current:exists:evetui-capture-contract.mjs `
    --expect-split-target-blocker "EveTui:TUI package release is cut from EveTui rather than Eve incubation" `
    --expect-split-target-blocker "EveTui:TUI capture path is owned by EveTui rather than Eve incubation"
  if ($LASTEXITCODE -ne 0) {
    throw "Split target conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "Split target conformance consumer smoke passed: $exportPath"
