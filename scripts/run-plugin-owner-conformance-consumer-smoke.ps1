param(
  [string] $ExportDirectory = "artifacts\conformance\latest",
  [string] $ConsumerDirectory = "artifacts\plugin-owner-conformance-consumer-smoke"
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

$conformanceRoot = if ($env:EVE_CONFORMANCE_ROOT) { $env:EVE_CONFORMANCE_ROOT } else { "E:\Projects\EveConformance" }
$consumerScript = Join-Path $conformanceRoot "tools\conformance\consume-export.mjs"

node $consumerScript $consumerExport `
  --expect-pack plugin `
  --expect-schema gamecult.eve.plugin.v1 `
  --expect-schema gamecult.eve.plugin_advertisement.v1 `
  --expect-schema gamecult.eve.plugin_handoff.v1 `
  --expect-schema gamecult.eve.plugin_abi_fixture.v1 `
  --expect-schema gamecult.eve.plugin_abi.request.v1 `
  --expect-schema gamecult.eve.plugin_abi.response.v1 `
  --expect-schema gamecult.eve.command_receipt.v1 `
  --expect-schema gamecult.eve.plugin_receipt.v1 `
  --expect-fixture sai-vn `
  --expect-plugin sai.vn `
  --expect-plugin norn.graph `
  --expect-plugin tex.math `
  --expect-plugin-operation sai.vn:describe `
  --expect-plugin-operation sai.vn:validate `
  --expect-plugin-operation sai.vn:project `
  --expect-plugin-operation sai.vn:apply `
  --expect-plugin-operation sai.vn:open `
  --expect-plugin-operation sai.vn:jump `
  --expect-plugin-abi-operation-coverage sai.vn:describe:contracted:Sai `
  --expect-plugin-abi-operation-coverage sai.vn:apply:contracted:Sai `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:sai.vn:satisfied:Sai:required `
  --expect-plugin-operation norn.graph:describe `
  --expect-plugin-operation norn.graph:validate `
  --expect-plugin-operation norn.graph:project `
  --expect-plugin-operation norn.graph:measure `
  --expect-plugin-abi-operation-coverage norn.graph:describe:contracted:Norn `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:norn.graph:optional-satisfied:Norn:optional-nested `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:tex.math:optional-satisfied:EvePlugins:optional-nested `
  --expect-independent-nested-plugin gamecult.home.vn:sai.visual_novel.surface:sai.vn:norn.graph:Norn `
  --expect-independent-nested-plugin gamecult.home.vn:sai.visual_novel.surface:sai.vn:tex.math:EvePlugins `
  --expect-plugin-capability sai.vn:vn.stage `
  --expect-plugin-capability sai.vn:story.choose `
  --expect-plugin-capability sai.vn:story.continue `
  --expect-plugin-capability sai.vn:story.jump `
  --expect-plugin-capability norn.graph:embed.norn `
  --expect-plugin-capability norn.graph:graph.node.activate `
  --expect-plugin-capability tex.math:embed.tex `
  --expect-plugin-capability tex.math:tex.inline `
  --expect-plugin-capability tex.math:tex.block `
  --expect-plugin-runtime sai.vn:executable-sidecar `
  --expect-plugin-runtime-transport sai.vn:cultnet-rudp `
  --expect-plugin-runtime-transport sai.vn:stdio `
  --expect-plugin-runtime-authority sai.vn:no-provider-state-mutation `
  --expect-plugin-runtime-field sai.vn:sidecar.processKind:long-running-daemon `
  --expect-plugin-runtime-field sai.vn:sidecar.protocol:cultnet-operation-v0 `
  --expect-plugin-runtime-field sai.vn:sidecar.requestSchema:gamecult.eve.plugin_abi.request.v1 `
  --expect-plugin-runtime-field sai.vn:sidecar.responseSchema:gamecult.eve.plugin_abi.response.v1 `
  --expect-plugin-runtime-field sai.vn:sidecar.stateAuthority:sai-sidecar-owns-story-session-provider-owns-command-acceptance `
  --expect-plugin-abi-field sai.vn:apply:expect.receiptSchema:gamecult.eve.command_receipt.v1 `
  --expect-plugin-witness sai.vn:cultnet-operation-v0+rudp:pass `
  --expect-plugin-runtime norn.graph:executable-sidecar `
  --expect-plugin-runtime-transport norn.graph:cultnet-rudp `
  --expect-plugin-runtime-transport norn.graph:stdio `
  --expect-plugin-runtime-authority norn.graph:no-provider-state-mutation `
  --expect-plugin-runtime-field norn.graph:sidecar.processKind:long-running-daemon `
  --expect-plugin-runtime-field norn.graph:sidecar.protocol:cultnet-operation-v0 `
  --expect-plugin-runtime-field norn.graph:sidecar.requestSchema:gamecult.eve.plugin_abi.request.v1 `
  --expect-plugin-runtime-field norn.graph:sidecar.responseSchema:gamecult.eve.plugin_abi.response.v1 `
  --expect-plugin-runtime-field norn.graph:sidecar.stateAuthority:proposes-plugin-state-only-provider-accepts `
  --expect-plugin-witness norn.graph:cultnet-operation-v0+rudp:pass `
  --expect-plugin-operation tex.math:describe `
  --expect-plugin-operation tex.math:validate `
  --expect-plugin-operation tex.math:project `
  --expect-plugin-operation tex.math:lower `
  --expect-plugin-operation tex.math:measure `
  --expect-plugin-operation tex.math:apply `
  --expect-plugin-abi-operation-coverage tex.math:describe:contracted:EvePlugins `
  --expect-plugin-abi-operation-coverage tex.math:lower:contracted:EvePlugins `
  --expect-plugin-abi-operation-coverage tex.math:apply:contracted:EvePlugins `
  --expect-plugin-runtime tex.math:executable-sidecar `
  --expect-plugin-runtime-transport tex.math:stdio `
  --expect-plugin-runtime-transport tex.math:cultnet-rudp `
  --expect-plugin-runtime-authority tex.math:no-provider-state-mutation `
  --expect-plugin-runtime-field tex.math:sidecar.processKind:long-running-daemon `
  --expect-plugin-runtime-field tex.math:sidecar.protocol:cultnet-operation-v0 `
  --expect-plugin-runtime-field tex.math:sidecar.requestSchema:gamecult.eve.plugin_abi.request.v1 `
  --expect-plugin-runtime-field tex.math:sidecar.responseSchema:gamecult.eve.plugin_abi.response.v1 `
  --expect-plugin-runtime-field tex.math:sidecar.stateAuthority:emits-render-results-only-provider-owns-source-state `
  --expect-plugin-abi-field tex.math:lower:expect.loweringKind:typeset-fragment `
  --expect-plugin-abi-field tex.math:lower:expect.fallbackKind:source-text `
  --expect-plugin-abi-field tex.math:apply:expect.receiptSchema:gamecult.eve.plugin_receipt.v1 `
  --expect-plugin-witness tex.math:cultnet-operation-v0+rudp:pass

if ($LASTEXITCODE -ne 0) {
  throw "Plugin owner conformance consumer smoke failed with exit code $LASTEXITCODE"
}
