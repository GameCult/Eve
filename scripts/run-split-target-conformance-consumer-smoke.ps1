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
    --expect-split-target-blocker "EveUnity:runtime:unity-scene:status:pending" `
    --expect-split-target-blocker-record EveUnity:runtime-status:unity-scene `
    --expect-split-target-blocker-record EveUnity:runtime-plugin-projection:unity-scene:sai.vn `
    --expect-split-target-blocker-record "EveUnity:pending-proof:Unity scene runtime body exists outside Aetheria product code." `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-runtime-body:replacement-required:no-source-paths:none `
    --expect-split-handoff-move EveUnity:unity-scene:unity-scene-command-transport:replacement-required:no-source-paths:none `
    --expect-split-target-blocker "EveUnity:Tagged UPM release" `
    --expect-split-target-blocker "EveUnity:Unity batchmode EditMode runner" `
    --expect-split-target-blocker "EveUnity:Unity batchmode or editor capture artifact" `
    --expect-split-target-blocker "EveUnity:Unity scene runtime body exists outside Aetheria product code" `
    --expect-split-target EveElectron `
    --expect-split-target-status EveElectron:incubating `
    --expect-split-target-proof "EveElectron:EveElectron split handoff is machine-readable" `
    --expect-split-target-proof "EveElectron:EveElectron lifecycle contract is machine-readable" `
    --expect-split-target-blocker "EveElectron:runtime:electron-shell:status:pending" `
    --expect-split-target-blocker-record EveElectron:runtime-status:electron-shell `
    --expect-split-target-blocker-record EveElectron:runtime-feature:electron-shell:providerAdvertisements `
    --expect-split-handoff-move EveElectron:electron-shell:electron-shell-runtime:observed-provider:exists:Aetheria.Rts.Web/Electron `
    --expect-split-handoff-move EveElectron:electron-shell:electron-command-transport:observed-provider:exists:Aetheria.Rts.Web/Client/app.ts `
    --expect-split-target-blocker "EveElectron:Electron shell runtime body exists outside Aetheria product code" `
    --expect-split-target EveTui `
    --expect-split-target-status EveTui:incubating `
    --expect-split-target-proof "EveTui:EveTui split handoff is machine-readable" `
    --expect-split-target-proof "EveTui:EveTui lifecycle contract is machine-readable" `
    --expect-split-target-blocker "EveTui:runtime:tui:status:pending" `
    --expect-split-target-blocker-record EveTui:runtime-feature:tui:commandTransport `
    --expect-split-target-blocker "EveTui:TUI runtime body exists outside provider product code"
  if ($LASTEXITCODE -ne 0) {
    throw "Split target conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "Split target conformance consumer smoke passed: $exportPath"
