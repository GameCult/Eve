param(
  [string] $ExportDirectory = "artifacts\conformance\latest",
  [string] $ConsumerDirectory = "artifacts\conformance-consumer-smoke"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$conformanceRoot = if ($env:EVE_CONFORMANCE_ROOT) { $env:EVE_CONFORMANCE_ROOT } else { "E:\Projects\EveConformance" }
$consumerScript = Join-Path $conformanceRoot "tools\conformance\consume-export.mjs"
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
  node $consumerScript $consumerExport `
    --expect-capability-matrix `
    --expect-schema gamecult.eve.conformance_export.v1 `
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
    --expect-local-provider-catalog-provider web:eve.world-smoke `
    --expect-local-provider-catalog-provider web:repixelizer `
    --expect-local-provider-catalog-provider web:gamecult.home.vn `
    --expect-local-provider-catalog-advertisement web:eve-world-smoke.provider-advertisement.json `
    --expect-local-provider-catalog-advertisement web:repixelizer.provider-advertisement.json `
    --expect-local-provider-catalog-advertisement web:sai-vn.provider-advertisement.json `
    --expect-scenario eve-world-smoke-command-replay `
    --expect-interactive-world-surface eve.world-smoke:eve.world-smoke.surface:web-reference:Eve `
    --expect-interactive-world-surface eve.world-smoke:eve.world-smoke.surface:unity-scene:Eve `
    --expect-interactive-world-surface eve.world-smoke:eve.world-smoke.surface:electron-shell:Eve `
    --expect-interactive-world-surface eve.world-smoke:eve.world-smoke.surface:tui:Eve `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:unity-scene:claimed:EveUnity:unity-scene `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.game:tui:claimed:EveTui:tui `
    --expect-world-lowering-coverage eve.world-smoke:eve.world-smoke.surface:web-reference:claimed:Eve:web `
    --expect-world-lowering-coverage eve.world-smoke:eve.world-smoke.surface:unity-uitoolkit:claimed:EveUnity:unity-uitoolkit `
    --expect-world-lowering-coverage eve.world-smoke:eve.world-smoke.surface:unity-scene:claimed:EveUnity:unity-scene `
    --expect-world-lowering-coverage eve.world-smoke:eve.world-smoke.surface:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage eve.world-smoke:eve.world-smoke.surface:tui:claimed:EveTui:tui `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:electron-shell:claimed:EveElectron:electron-shell `
    --expect-world-lowering-coverage aetheria:aetheria.daemon.editor:tui:claimed:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:unity-scene:covered:EveUnity:unity-scene `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.game:tui:covered:EveTui:tui `
    --expect-command-boundary-coverage eve.world-smoke:eve.world-smoke.surface:web-reference:covered:Eve:web `
    --expect-command-boundary-coverage eve.world-smoke:eve.world-smoke.surface:unity-uitoolkit:covered:EveUnity:unity-uitoolkit `
    --expect-command-boundary-coverage eve.world-smoke:eve.world-smoke.surface:unity-scene:covered:EveUnity:unity-scene `
    --expect-command-boundary-coverage eve.world-smoke:eve.world-smoke.surface:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage eve.world-smoke:eve.world-smoke.surface:tui:covered:EveTui:tui `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:electron-shell:covered:EveElectron:electron-shell `
    --expect-command-boundary-coverage aetheria:aetheria.daemon.editor:tui:covered:EveTui:tui `
    --expect-screenshot-metric web:embedded-surface:structure:pass `
    --expect-screenshot-metric web:embedded-surface:color-tokens:pass `
    --expect-screenshot-metric web:embedded-surface:text-presence:pass `
    --expect-screenshot-metric web:embedded-surface:bounding-boxes:pass `
    --expect-screenshot-metric web:sai-vn:structure:pass `
    --expect-screenshot-metric web:sai-vn:color-tokens:pass `
    --expect-screenshot-metric web:sai-vn:bounding-boxes:pass `
    --expect-screenshot-metric web:eve-world-smoke:structure:pass `
    --expect-screenshot-metric web:eve-world-smoke:color-tokens:pass `
    --expect-screenshot-metric web:eve-world-smoke:text-presence:pass `
    --expect-screenshot-metric web:eve-world-smoke:bounding-boxes:pass `
    --expect-screenshot-metric electron-shell:aetheria-world:bounding-boxes:pending-capture `
    --expect-runtime-capture-probe unity-uitoolkit:contract-artifact-missing:png:EveUnity `
    --expect-runtime-capture-probe unity-scene:control-artifact-present-product-capture-pending:png:EveUnity `
    --expect-runtime-capture-probe electron-shell:contract-artifact-present:png:EveElectron `
    --expect-runtime-witness electron-shell:eve.world-smoke:eve.world-smoke.surface:cold:pass `
    --expect-runtime-witness electron-shell:aetheria:aetheria.daemon.game:cold:pass `
    --expect-runtime-capture-probe tui:contract-artifact-present:json-grid:EveTui `
    --expect-capability-gap "split-target:EveUnity:EveUnity:proof:Unity PlayMode frame capture"
  if ($LASTEXITCODE -ne 0) {
    throw "Conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
