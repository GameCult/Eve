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

$consumerScript = Join-Path $projectRoot "tools\conformance\consume-export.mjs"

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
  --expect-plugin-handoff sai.vn `
  --expect-plugin-handoff norn.graph `
  --expect-plugin-handoff tex.math `
  --expect-plugin-handoff-move sai.vn:plugin-manifest:current:exists:sai-vn.plugin.json `
  --expect-plugin-handoff-move sai.vn:abi-conformance:current:exists:sai-vn.plugin-abi-fixture.json `
  --expect-plugin-handoff-move norn.graph:plugin-manifest:current:exists:norn-graph.plugin.json `
  --expect-plugin-handoff-move norn.graph:abi-conformance:current:exists:norn-graph.plugin-abi-fixture.json `
  --expect-plugin-handoff-move tex.math:plugin-manifest:current:exists:tex-math.plugin.json `
  --expect-plugin-handoff-move tex.math:abi-conformance:current:exists:tex-math.plugin-abi-fixture.json `
  --expect-plugin-operation sai.vn:describe `
  --expect-plugin-operation sai.vn:validate `
  --expect-plugin-operation sai.vn:project `
  --expect-plugin-operation sai.vn:lower `
  --expect-plugin-operation sai.vn:measure `
  --expect-plugin-operation sai.vn:apply `
  --expect-plugin-abi-operation-coverage sai.vn:describe:contracted:Sai `
  --expect-plugin-abi-operation-coverage sai.vn:lower:contracted:Sai `
  --expect-plugin-abi-operation-coverage sai.vn:apply:contracted:Sai `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:sai.vn:satisfied:Sai:required `
  --expect-plugin-operation norn.graph:describe `
  --expect-plugin-operation norn.graph:validate `
  --expect-plugin-operation norn.graph:project `
  --expect-plugin-operation norn.graph:lower `
  --expect-plugin-operation norn.graph:measure `
  --expect-plugin-operation norn.graph:apply `
  --expect-plugin-abi-operation-coverage norn.graph:describe:contracted:Norn `
  --expect-plugin-abi-operation-coverage norn.graph:lower:contracted:Norn `
  --expect-plugin-abi-operation-coverage norn.graph:apply:contracted:Norn `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:norn.graph:optional-satisfied:Norn:optional-nested `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:tex.math:optional-satisfied:EvePlugins:optional-nested `
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
  --expect-plugin-runtime-transport sai.vn:cultmesh `
  --expect-plugin-runtime-authority sai.vn:no-provider-state-mutation `
  --expect-plugin-runtime-field sai.vn:sidecar.processKind:long-running-daemon `
  --expect-plugin-runtime-field sai.vn:sidecar.protocol:cultmesh-rpc-with-stdio-dev-transport `
  --expect-plugin-runtime-field sai.vn:sidecar.requestSchema:gamecult.eve.plugin_abi.request.v1 `
  --expect-plugin-runtime-field sai.vn:sidecar.responseSchema:gamecult.eve.plugin_abi.response.v1 `
  --expect-plugin-runtime-field sai.vn:sidecar.stateAuthority:proposes-plugin-state-only-provider-accepts `
  --expect-plugin-abi-field sai.vn:lower:expect.commandEnvelope:gamecult.eve.command.v1 `
  --expect-plugin-abi-field sai.vn:apply:expect.receiptSchema:gamecult.eve.command_receipt.v1 `
  --expect-plugin-runtime norn.graph:executable-sidecar `
  --expect-plugin-runtime-transport norn.graph:cultmesh `
  --expect-plugin-runtime-authority norn.graph:no-provider-state-mutation `
  --expect-plugin-runtime-field norn.graph:sidecar.processKind:long-running-daemon `
  --expect-plugin-runtime-field norn.graph:sidecar.protocol:cultmesh-rpc-with-stdio-dev-transport `
  --expect-plugin-runtime-field norn.graph:sidecar.requestSchema:gamecult.eve.plugin_abi.request.v1 `
  --expect-plugin-runtime-field norn.graph:sidecar.responseSchema:gamecult.eve.plugin_abi.response.v1 `
  --expect-plugin-runtime-field norn.graph:sidecar.stateAuthority:proposes-plugin-state-only-provider-accepts `
  --expect-plugin-abi-field norn.graph:lower:expect.commandEnvelope:gamecult.eve.command.v1 `
  --expect-plugin-abi-field norn.graph:apply:expect.receiptSchema:gamecult.eve.command_receipt.v1 `
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
  --expect-plugin-runtime-transport tex.math:cultmesh `
  --expect-plugin-runtime-authority tex.math:no-provider-state-mutation `
  --expect-plugin-runtime-field tex.math:sidecar.processKind:long-running-daemon `
  --expect-plugin-runtime-field tex.math:sidecar.protocol:cultmesh-rpc-with-stdio-dev-transport `
  --expect-plugin-runtime-field tex.math:sidecar.requestSchema:gamecult.eve.plugin_abi.request.v1 `
  --expect-plugin-runtime-field tex.math:sidecar.responseSchema:gamecult.eve.plugin_abi.response.v1 `
  --expect-plugin-runtime-field tex.math:sidecar.stateAuthority:emits-render-results-only-provider-owns-source-state `
  --expect-plugin-abi-field tex.math:lower:expect.loweringKind:typeset-fragment `
  --expect-plugin-abi-field tex.math:lower:expect.fallbackKind:source-text `
  --expect-plugin-abi-field tex.math:apply:expect.receiptSchema:gamecult.eve.plugin_receipt.v1

if ($LASTEXITCODE -ne 0) {
  throw "Plugin owner conformance consumer smoke failed with exit code $LASTEXITCODE"
}
