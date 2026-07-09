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
    --expect-schema gamecult.eve.conformance_export.v1 `
    --expect-schema gamecult.eve.conformance_handoff.v1 `
    --expect-schema gamecult.eve.capability_matrix.v1 `
    --expect-schema gamecult.eve.command_receipt.v1 `
    --expect-schema gamecult.eve.plugin_receipt.v1 `
    --expect-schema gamecult.eve.plugin_abi.request.v1 `
    --expect-schema gamecult.eve.plugin_abi.response.v1 `
    --expect-schema gamecult.eve.runtime_release_request.v1 `
    --expect-schema gamecult.eve.runtime_capture_request.v1 `
    --expect-schema gamecult.eve.runtime_lifecycle.v1 `
    --expect-schema gamecult.eve.runtime_split_handoff.v1 `
    --expect-schema gamecult.eve.plugin_handoff.v1 `
    --expect-schema gamecult.eve.provider_handoff.v1 `
    --expect-schema gamecult.eve.local_provider_catalog.v1 `
    --expect-schema gamecult.eve.electron_shell_projection.v1 `
    --expect-schema gamecult.eve.tui_grid.v1 `
    --expect-schema gamecult.eve.web_layout_probe.v1 `
    --expect-capability-gap runtime:Fensalir:direct2d:capture:missing `
    --expect-local-provider-catalog web:valid:local-provider-catalog.json `
    --expect-local-provider-catalog-provider web:aetheria `
    --expect-local-provider-catalog-provider web:repixelizer `
    --expect-local-provider-catalog-provider web:gamecult.home.vn `
    --expect-local-provider-catalog-advertisement web:aetheria.provider-advertisement.json `
    --expect-local-provider-catalog-advertisement web:repixelizer.provider-advertisement.json `
    --expect-local-provider-catalog-advertisement web:sai-vn.provider-advertisement.json `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-scene:claimed:EveUnity:unity-scene `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:tui:claimed:EveTui:tui `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:tui:claimed:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-scene:covered:EveUnity:unity-scene `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:tui:covered:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:tui:covered:EveTui:tui `
    --expect-screenshot-metric web:embedded-surface:structure:pass `
    --expect-screenshot-metric web:embedded-surface:color-tokens:pass `
    --expect-screenshot-metric web:embedded-surface:text-presence:pass `
    --expect-screenshot-metric web:embedded-surface:bounding-boxes:pass `
    --expect-screenshot-metric web:sai-vn:structure:pass `
    --expect-screenshot-metric web:sai-vn:color-tokens:pass `
    --expect-screenshot-metric web:sai-vn:bounding-boxes:pass `
    --expect-screenshot-metric electron-shell:aetheria-world:bounding-boxes:pending-capture `
    --expect-capability-gap "split-target:EveUnity:EveUnity:proof:Tagged UPM release" `
    --expect-conformance-handoff
  if ($LASTEXITCODE -ne 0) {
    throw "Conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
