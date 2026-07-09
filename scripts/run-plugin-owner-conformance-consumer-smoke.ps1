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
  --expect-fixture sai-vn `
  --expect-plugin sai.vn `
  --expect-plugin norn.graph `
  --expect-plugin-handoff sai.vn `
  --expect-plugin-handoff norn.graph `
  --expect-plugin-operation sai.vn:describe `
  --expect-plugin-operation sai.vn:validate `
  --expect-plugin-operation sai.vn:project `
  --expect-plugin-operation sai.vn:lower `
  --expect-plugin-operation sai.vn:measure `
  --expect-plugin-operation sai.vn:apply `
  --expect-plugin-abi-operation-coverage sai.vn:describe:contracted:Sai `
  --expect-plugin-abi-operation-coverage sai.vn:lower:contracted:Sai `
  --expect-plugin-abi-operation-coverage sai.vn:apply:contracted:Sai `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:sai.vn:satisfied:Sai `
  --expect-plugin-operation norn.graph:describe `
  --expect-plugin-operation norn.graph:validate `
  --expect-plugin-operation norn.graph:project `
  --expect-plugin-operation norn.graph:lower `
  --expect-plugin-operation norn.graph:measure `
  --expect-plugin-operation norn.graph:apply `
  --expect-plugin-abi-operation-coverage norn.graph:describe:contracted:Norn `
  --expect-plugin-abi-operation-coverage norn.graph:lower:contracted:Norn `
  --expect-plugin-abi-operation-coverage norn.graph:apply:contracted:Norn `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:norn.graph:satisfied:Norn `
  --expect-provider-plugin-requirement gamecult.home.vn:sai.visual_novel.surface:tex.math:satisfied:EvePlugins `
  --expect-plugin-capability sai.vn:vn.stage `
  --expect-plugin-capability sai.vn:story.choose `
  --expect-plugin-capability sai.vn:story.continue `
  --expect-plugin-capability sai.vn:story.jump `
  --expect-plugin-capability norn.graph:embed.norn `
  --expect-plugin-capability norn.graph:graph.node.activate `
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
  --expect-plugin-abi-field norn.graph:apply:expect.receiptSchema:gamecult.eve.command_receipt.v1

if ($LASTEXITCODE -ne 0) {
  throw "Plugin owner conformance consumer smoke failed with exit code $LASTEXITCODE"
}
