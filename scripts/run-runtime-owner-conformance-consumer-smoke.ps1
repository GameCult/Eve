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
  --expect-runtime direct2d `
  --expect-runtime-status web:active `
  --expect-runtime-status windows-flutter:active `
  --expect-runtime-status linux-flutter:active `
  --expect-runtime-status android-flutter:active `
  --expect-runtime-status unity-uitoolkit:active `
  --expect-runtime-status direct2d:external-adapter-spike `
  --expect-runtime-feature web:providerAdvertisements `
  --expect-runtime-feature windows-flutter:embeddedDocuments `
  --expect-runtime-feature unity-uitoolkit:embeddedDocuments `
  --expect-runtime-feature direct2d:embeddedDocuments `
  --expect-runtime-world-target web:web-reference `
  --expect-runtime-world-field web:web-reference:supportLevel:reference-dom-canvas-command-boundary `
  --expect-runtime-world-field web:web-reference:ownership:runtime-lowers-provider-world-surface-without-owning-world-state `
  --expect-runtime-world-target unity-uitoolkit:unity-uitoolkit `
  --expect-runtime-world-field unity-uitoolkit:unity-uitoolkit:supportLevel:ui-toolkit-semantic-command-surface `
  --expect-runtime-world-field unity-uitoolkit:unity-uitoolkit:ownership:runtime-lowers-provider-world-surface-without-owning-world-state `
  --expect-runtime-plugin-gap unity-uitoolkit:tex.math:EveUnity `
  --expect-runtime-plugin-gap unity-scene:sai.vn:EveUnity `
  --expect-runtime-plugin-gap unity-scene:norn.graph:EveUnity `
  --expect-runtime-plugin-gap electron-shell:sai.vn:EveElectron `
  --expect-runtime-plugin-gap electron-shell:norn.graph:EveElectron `
  --expect-runtime-handoff unity-uitoolkit `
  --expect-runtime-command-schema web:gamecult.eve.command.v1 `
  --expect-runtime-command-schema windows-flutter:gamecult.eve.command.v1 `
  --expect-runtime-command-schema unity-uitoolkit:gamecult.eve.command.v1 `
  --expect-runtime-capture-status web:chrome-headless `
  --expect-runtime-capture-status windows-flutter:golden `
  --expect-runtime-capture-status linux-flutter:ssh-golden `
  --expect-runtime-capture-status android-flutter:adb-png `
  --expect-runtime-capture-status unity-uitoolkit:semantic `
  --expect-runtime-capture-status direct2d:missing `
  --expect-runtime-lifecycle-status unity-uitoolkit:release:incubating-upm-package `
  --expect-runtime-lifecycle-status unity-uitoolkit:test:batchmode-editmode-tests-and-consumer-build-smoke `
  --expect-runtime-lifecycle-status unity-uitoolkit:capture:pending-editor-capture `
  --expect-runtime-lifecycle-pending "unity-uitoolkit:release:Tagged UPM release" `
  --expect-runtime-lifecycle-pending "unity-uitoolkit:test:Unity batchmode EditMode runner" `
  --expect-runtime-lifecycle-pending "unity-uitoolkit:capture:Unity batchmode or editor capture artifact" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.packageName:org.gamecult.eve.unity-uitoolkit" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.artifactKind:upm-package" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.tagPattern:eveunity-uitoolkit-v{version}" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:release:releaseContract.packageRoot:packages/org.gamecult.eve.unity-uitoolkit" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.runnerKind:unity-editmode-batchmode" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.runnerScript:scripts/run-aetheria-unity-editmode-tests.ps1" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.packageName:org.gamecult.eve.unity-uitoolkit" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.testAssembly:GameCult.Eve.UnityUIToolkit.Tests" `
  --expect-runtime-lifecycle-field "unity-uitoolkit:test:testContract.testPlatform:EditMode"

if ($LASTEXITCODE -ne 0) {
  throw "Runtime owner conformance consumer smoke failed with exit code $LASTEXITCODE"
}
