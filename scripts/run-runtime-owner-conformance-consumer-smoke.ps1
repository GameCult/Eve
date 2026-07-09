param(
  [string] $ExportDirectory = "artifacts\conformance\latest",
  [string] $ConsumerDirectory = "artifacts\runtime-owner-conformance-consumer-smoke"
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

if (Test-Path $consumerExport) {
  Remove-Item -LiteralPath $consumerExport -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $consumerRoot | Out-Null
Copy-Item -LiteralPath $sourceExport -Destination $consumerExport -Recurse

$consumerScript = Join-Path $projectRoot "tools\conformance\consume-export.mjs"

node $consumerScript $consumerExport `
  --expect-pack runtime `
  --expect-runtime web `
  --expect-runtime windows-flutter `
  --expect-runtime linux-flutter `
  --expect-runtime android-flutter `
  --expect-runtime unity-uitoolkit `
  --expect-runtime unity-scene `
  --expect-runtime electron-shell `
  --expect-runtime tui `
  --expect-runtime direct2d `
  --expect-runtime-status web:active `
  --expect-runtime-status windows-flutter:active `
  --expect-runtime-status linux-flutter:active `
  --expect-runtime-status android-flutter:active `
  --expect-runtime-status unity-uitoolkit:active `
  --expect-runtime-status unity-scene:pending `
  --expect-runtime-status electron-shell:pending `
  --expect-runtime-status tui:pending `
  --expect-runtime-status direct2d:external-adapter-spike `
  --expect-runtime-feature web:providerAdvertisements `
  --expect-runtime-feature windows-flutter:embeddedDocuments `
  --expect-runtime-feature unity-uitoolkit:embeddedDocuments `
  --expect-runtime-feature unity-scene:providerAdvertisements `
  --expect-runtime-feature unity-scene:commandTransport `
  --expect-runtime-feature unity-scene:sceneGraphProjection `
  --expect-runtime-feature electron-shell:providerAdvertisements `
  --expect-runtime-feature electron-shell:commandTransport `
  --expect-runtime-feature electron-shell:surfaceTreeProjection `
  --expect-runtime-feature tui:providerAdvertisements `
  --expect-runtime-feature tui:commandTransport `
  --expect-runtime-feature tui:terminalGridSummary `
  --expect-runtime-feature tui:terminalGridLowering `
  --expect-runtime-feature direct2d:embeddedDocuments `
  --expect-runtime-world-target web:web-reference `
  --expect-runtime-world-field web:web-reference:supportLevel:reference-dom-canvas-command-boundary `
  --expect-runtime-world-field web:web-reference:ownership:runtime-lowers-provider-world-surface-without-owning-world-state `
  --expect-runtime-world-target unity-uitoolkit:unity-uitoolkit `
  --expect-runtime-world-field unity-uitoolkit:unity-uitoolkit:supportLevel:ui-toolkit-semantic-command-surface `
  --expect-runtime-world-field unity-uitoolkit:unity-uitoolkit:ownership:runtime-lowers-provider-world-surface-without-owning-world-state `
  --expect-runtime-world-target unity-scene:unity-scene `
  --expect-runtime-world-field unity-scene:unity-scene:supportLevel:unity-scene-graph-command-surface `
  --expect-runtime-world-field unity-scene:unity-scene:ownership:runtime-lowers-provider-world-surface-without-owning-world-state `
  --expect-runtime-world-target electron-shell:electron-shell `
  --expect-runtime-world-field electron-shell:electron-shell:supportLevel:electron-shell-surface-tree-command-surface `
  --expect-runtime-world-field electron-shell:electron-shell:ownership:runtime-lowers-provider-world-surface-without-owning-world-state `
  --expect-runtime-world-target tui:tui `
  --expect-runtime-world-field tui:tui:supportLevel:terminal-grid-command-surface `
  --expect-runtime-world-field tui:tui:ownership:runtime-lowers-provider-world-surface-without-owning-world-state `
  --expect-runtime-plugin-projection unity-uitoolkit:sai.vn:supported:EveUnity `
  --expect-runtime-plugin-projection unity-uitoolkit:norn.graph:supported:EveUnity `
  --expect-runtime-plugin-projection unity-uitoolkit:tex.math:unsupported:EveUnity `
  --expect-runtime-plugin-projection unity-scene:sai.vn:unsupported:EveUnity `
  --expect-runtime-plugin-projection electron-shell:sai.vn:unsupported:EveElectron `
  --expect-provider-runtime-plugin-projection gamecult.home.vn:sai.visual_novel.surface:web:sai.vn:supported:Eve `
  --expect-provider-runtime-plugin-projection gamecult.home.vn:sai.visual_novel.surface:web:tex.math:optional-supported:Eve `
  --expect-provider-runtime-plugin-projection gamecult.home.vn:sai.visual_novel.surface:unity-uitoolkit:sai.vn:supported:EveUnity `
  --expect-provider-runtime-plugin-projection gamecult.home.vn:sai.visual_novel.surface:unity-uitoolkit:norn.graph:optional-supported:EveUnity `
  --expect-provider-runtime-plugin-projection gamecult.home.vn:sai.visual_novel.surface:unity-uitoolkit:tex.math:optional-unsupported-runtime-projection:EveUnity `
  --expect-provider-runtime-plugin-projection gamecult.home.vn:sai.visual_novel.surface:ios-uikit:sai.vn:unsupported-runtime-projection:EveIOS `
  --expect-provider-runtime-plugin-projection gamecult.home.vn:sai.visual_novel.surface:ios-uikit:norn.graph:optional-unsupported-runtime-projection:EveIOS `
  --expect-runtime-plugin-gap unity-uitoolkit:tex.math:EveUnity `
  --expect-runtime-plugin-gap unity-scene:sai.vn:EveUnity `
  --expect-runtime-plugin-gap unity-scene:norn.graph:EveUnity `
  --expect-runtime-plugin-gap unity-scene:tex.math:EveUnity `
  --expect-runtime-plugin-gap electron-shell:sai.vn:EveElectron `
  --expect-runtime-plugin-gap electron-shell:norn.graph:EveElectron `
  --expect-runtime-plugin-gap electron-shell:tex.math:EveElectron `
  --expect-runtime-plugin-gap tui:sai.vn:EveTui `
  --expect-runtime-plugin-gap tui:norn.graph:EveTui `
  --expect-runtime-plugin-gap tui:tex.math:EveTui `
  --expect-runtime-handoff unity-uitoolkit `
  --expect-runtime-command-schema web:gamecult.eve.command.v1 `
  --expect-runtime-command-schema windows-flutter:gamecult.eve.command.v1 `
  --expect-runtime-command-schema unity-uitoolkit:gamecult.eve.command.v1 `
  --expect-runtime-command-schema unity-scene:gamecult.eve.command.v1 `
  --expect-runtime-command-schema electron-shell:gamecult.eve.command.v1 `
  --expect-runtime-command-schema tui:gamecult.eve.command.v1 `
  --expect-runtime-capture-status web:chrome-headless `
  --expect-runtime-capture-status windows-flutter:golden `
  --expect-runtime-capture-status linux-flutter:ssh-golden `
  --expect-runtime-capture-status android-flutter:adb-png `
  --expect-runtime-capture-status unity-uitoolkit:semantic `
  --expect-runtime-capture-status unity-scene:missing `
  --expect-runtime-capture-status electron-shell:missing `
  --expect-runtime-capture-status tui:missing `
  --expect-runtime-capture-status direct2d:missing `
  --expect-runtime-lifecycle-status unity-uitoolkit:release:incubating-upm-package `
  --expect-runtime-lifecycle-status unity-uitoolkit:test:batchmode-editmode-tests-and-consumer-build-smoke `
  --expect-runtime-lifecycle-status unity-uitoolkit:capture:pending-editor-capture `
  --expect-runtime-lifecycle-pending "unity-uitoolkit:release:Tagged UPM release" `
  --expect-runtime-lifecycle-pending "unity-uitoolkit:test:Unity batchmode EditMode runner" `
  --expect-runtime-lifecycle-pending "unity-uitoolkit:capture:Unity batchmode or editor capture artifact" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.packageName:org.gamecult.eve.unity-uitoolkit" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.artifactKind:upm-package" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.requestSchema:gamecult.eve.runtime_release_request.v1" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.requestBuilder:tools/eveunity/eveunity-release-contract.mjs" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.artifactPattern:artifacts/eveunity-uitoolkit-release/{version}/org.gamecult.eve.unity-uitoolkit-{version}.tgz" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.tagPattern:eveunity-uitoolkit-v{version}" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.packageRoot:packages/org.gamecult.eve.unity-uitoolkit" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.runnerKind:unity-editmode-batchmode" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.runnerScript:scripts/run-aetheria-unity-editmode-tests.ps1" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.packageName:org.gamecult.eve.unity-uitoolkit" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.testAssembly:GameCult.Eve.UnityUIToolkit.Tests" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.testPlatform:EditMode" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.captureKind:unity-editor-or-batchmode-png" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.artifactKind:png" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.targetId:unity-uitoolkit" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.requestSchema:gamecult.eve.runtime_capture_request.v1" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.requestBuilder:tools/eveunity/eveunity-capture-contract.mjs" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.advertisementPath:web/fixtures/aetheria.provider-advertisement.json" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.conformanceAttachment:runtime.captureArtifacts[]" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.requiredProvider:aetheria" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:capture:captureContract.requiredSurface:aetheria.daemon.game" `
  --expect-runtime-lifecycle-status unity-scene:release:pending-unity-scene-package `
  --expect-runtime-lifecycle-status unity-scene:test:provider-shell-contract-skeleton `
  --expect-runtime-lifecycle-status unity-scene:capture:pending-unity-scene-capture `
  --expect-runtime-lifecycle-pending "unity-scene:release:Unity scene package release" `
  --expect-runtime-lifecycle-pending "unity-scene:test:Unity scene provider-advertisement smoke" `
  --expect-runtime-lifecycle-pending "unity-scene:capture:Unity scene screenshot or frame-capture artifact" `
  --expect-runtime-lifecycle-field "unity-scene:release:releaseContract.packageName:org.gamecult.eve.unity-scene" `
  --expect-runtime-lifecycle-field "unity-scene:release:releaseContract.artifactKind:upm-package" `
  --expect-runtime-lifecycle-field "unity-scene:release:releaseContract.tagPattern:eveunity-scene-v{version}" `
  --expect-runtime-lifecycle-field "unity-scene:release:releaseContract.versionSource:runtimes/incubating/eve-unity-scene/package.json" `
  --expect-runtime-lifecycle-field "unity-scene:release:releaseContract.requestSchema:gamecult.eve.runtime_release_request.v1" `
  --expect-runtime-lifecycle-field "unity-scene:release:releaseContract.requestBuilder:tools/eveunity/eveunity-release-contract.mjs" `
  --expect-runtime-lifecycle-field "unity-scene:release:releaseContract.artifactPattern:artifacts/eveunity-scene-release/{version}/org.gamecult.eve.unity-scene-{version}.tgz" `
  --expect-runtime-lifecycle-field "unity-scene:test:testContract.runnerKind:unity-scene-provider-shell-smoke" `
  --expect-runtime-lifecycle-field "unity-scene:test:testContract.runnerScript:scripts/run-eveunity-scene-provider-shell-smoke.ps1" `
  --expect-runtime-lifecycle-field "unity-scene:capture:captureContract.captureKind:unity-scene-frame-png" `
  --expect-runtime-lifecycle-field "unity-scene:capture:captureContract.targetId:unity-scene" `
  --expect-runtime-lifecycle-field "unity-scene:capture:captureContract.requestSchema:gamecult.eve.runtime_capture_request.v1" `
  --expect-runtime-lifecycle-field "unity-scene:capture:captureContract.requestBuilder:tools/eveunity/eveunity-capture-contract.mjs" `
  --expect-runtime-lifecycle-field "unity-scene:capture:captureContract.advertisementPath:web/fixtures/aetheria.provider-advertisement.json" `
  --expect-runtime-lifecycle-field "unity-scene:capture:captureContract.requiredSurface:aetheria.daemon.game" `
  --expect-runtime-lifecycle-status electron-shell:release:pending-electron-package `
  --expect-runtime-lifecycle-status electron-shell:test:provider-shell-contract-skeleton `
  --expect-runtime-lifecycle-status electron-shell:capture:pending-electron-window-capture `
  --expect-runtime-lifecycle-pending "electron-shell:release:Electron packaged app release" `
  --expect-runtime-lifecycle-pending "electron-shell:test:Electron provider-advertisement smoke runs from EveElectron in a packaged Electron window" `
  --expect-runtime-lifecycle-pending "electron-shell:capture:Electron window capture artifact" `
  --expect-runtime-lifecycle-field "electron-shell:release:releaseContract.artifactKind:electron-app" `
  --expect-runtime-lifecycle-field "electron-shell:release:releaseContract.versionSource:runtimes/incubating/eve-electron/package.json" `
  --expect-runtime-lifecycle-field "electron-shell:release:releaseContract.requestSchema:gamecult.eve.runtime_release_request.v1" `
  --expect-runtime-lifecycle-field "electron-shell:release:releaseContract.requestBuilder:tools/eveelectron/eveelectron-release-contract.mjs" `
  --expect-runtime-lifecycle-field "electron-shell:release:releaseContract.artifactPattern:artifacts/eveelectron-release/{version}/eve-electron-{version}.zip" `
  --expect-runtime-lifecycle-field "electron-shell:test:testContract.runnerKind:electron-provider-shell-smoke" `
  --expect-runtime-lifecycle-field "electron-shell:test:testContract.runnerScript:scripts/run-eveelectron-provider-shell-smoke.ps1" `
  --expect-runtime-lifecycle-field "electron-shell:capture:captureContract.captureKind:electron-window-png" `
  --expect-runtime-lifecycle-field "electron-shell:capture:captureContract.targetId:electron-shell" `
  --expect-runtime-lifecycle-field "electron-shell:capture:captureContract.requestSchema:gamecult.eve.runtime_capture_request.v1" `
  --expect-runtime-lifecycle-field "electron-shell:capture:captureContract.requestBuilder:tools/eveelectron/eveelectron-capture-contract.mjs" `
  --expect-runtime-lifecycle-field "electron-shell:capture:captureContract.advertisementPath:web/fixtures/aetheria.provider-advertisement.json" `
  --expect-runtime-lifecycle-field "electron-shell:capture:captureContract.requiredSurface:aetheria.daemon.game" `
  --expect-runtime-lifecycle-status tui:release:pending-tui-package `
  --expect-runtime-lifecycle-status tui:test:provider-shell-contract-skeleton `
  --expect-runtime-lifecycle-status tui:capture:pending-terminal-capture `
  --expect-runtime-lifecycle-pending "tui:release:TUI package release" `
  --expect-runtime-lifecycle-pending "tui:test:TUI provider-advertisement smoke runs from EveTui with durable terminal transcript or cell-grid artifacts" `
  --expect-runtime-lifecycle-pending "tui:capture:TUI terminal transcript or cell-grid capture artifact" `
  --expect-runtime-lifecycle-field "tui:release:releaseContract.artifactKind:terminal-runtime" `
  --expect-runtime-lifecycle-field "tui:release:releaseContract.versionSource:runtimes/incubating/eve-tui/package.json" `
  --expect-runtime-lifecycle-field "tui:release:releaseContract.requestSchema:gamecult.eve.runtime_release_request.v1" `
  --expect-runtime-lifecycle-field "tui:release:releaseContract.requestBuilder:tools/evetui/evetui-release-contract.mjs" `
  --expect-runtime-lifecycle-field "tui:release:releaseContract.artifactPattern:artifacts/evetui-release/{version}/eve-tui-{version}.tgz" `
  --expect-runtime-lifecycle-field "tui:test:testContract.runnerKind:terminal-provider-shell-smoke" `
  --expect-runtime-lifecycle-field "tui:test:testContract.runnerScript:scripts/run-evetui-provider-shell-smoke.ps1" `
  --expect-runtime-lifecycle-field "tui:capture:captureContract.captureKind:terminal-transcript-or-cell-grid" `
  --expect-runtime-lifecycle-field "tui:capture:captureContract.targetId:tui" `
  --expect-runtime-lifecycle-field "tui:capture:captureContract.requestSchema:gamecult.eve.runtime_capture_request.v1" `
  --expect-runtime-lifecycle-field "tui:capture:captureContract.requestBuilder:tools/evetui/evetui-capture-contract.mjs" `
  --expect-runtime-lifecycle-field "tui:capture:captureContract.advertisementPath:web/fixtures/aetheria.provider-advertisement.json" `
  --expect-runtime-lifecycle-field "tui:capture:captureContract.requiredSurface:aetheria.daemon.game"

if ($LASTEXITCODE -ne 0) {
  throw "Runtime owner conformance consumer smoke failed with exit code $LASTEXITCODE"
}
