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
  --expect-plugin-operation norn.graph:describe `
  --expect-plugin-operation norn.graph:validate `
  --expect-plugin-operation norn.graph:project `
  --expect-plugin-operation norn.graph:lower `
  --expect-plugin-operation norn.graph:measure `
  --expect-plugin-operation norn.graph:apply `
  --expect-plugin-capability sai.vn:vn.stage `
  --expect-plugin-capability sai.vn:story.choose `
  --expect-plugin-capability sai.vn:story.continue `
  --expect-plugin-capability sai.vn:story.jump `
  --expect-plugin-capability norn.graph:embed.norn `
  --expect-plugin-capability norn.graph:graph.node.activate

if ($LASTEXITCODE -ne 0) {
  throw "Plugin owner conformance consumer smoke failed with exit code $LASTEXITCODE"
}
