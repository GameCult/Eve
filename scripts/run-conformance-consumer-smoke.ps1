param(
  [string] $ExportDirectory = "artifacts\conformance\latest",
  [string] $ConsumerDirectory = "artifacts\conformance-consumer-smoke"
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

Push-Location $projectRoot
try {
  node .\tools\conformance\consume-export.mjs $consumerExport `
    --expect-capability-matrix `
    --expect-capability-gap runtime:Fensalir:direct2d:capture:missing `
    --expect-capability-gap "runtime:EveTui:tui:provider:aetheria:surface:aetheria.daemon.game:world-lowering-target:tui:missing-runtime" `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-scene:claimed:EveUnity:unity-scene `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:tui:missing-claim:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-scene:covered:EveUnity:unity-scene `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:tui:missing-runtime-claim:EveTui:tui `
    --expect-world-lowering-gap aetheria:aetheria.daemon.game:tui:EveTui:tui `
    --expect-world-lowering-gap aetheria:aetheria.daemon.editor:tui:EveTui:tui `
    --expect-capability-gap "split-target:EveUnity:EveUnity:proof:Tagged UPM release" `
    --expect-conformance-handoff
  if ($LASTEXITCODE -ne 0) {
    throw "Conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
