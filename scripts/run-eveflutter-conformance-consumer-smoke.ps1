param(
  [string] $ExportDirectory = "artifacts\conformance\latest",
  [string] $FlutterRoot = "flutter\eve_parity",
  [string] $ConsumerDirectory = "artifacts\eveflutter-conformance-consumer-smoke"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceExport = if ([System.IO.Path]::IsPathRooted($ExportDirectory)) {
  $ExportDirectory
} else {
  Join-Path $projectRoot $ExportDirectory
}
$flutterRootPath = if ([System.IO.Path]::IsPathRooted($FlutterRoot)) {
  $FlutterRoot
} else {
  Join-Path $projectRoot $FlutterRoot
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
if (-not (Test-Path $flutterRootPath)) {
  throw "EveFlutter consumer root not found: $flutterRootPath"
}

if (Test-Path $consumerExport) {
  Remove-Item -LiteralPath $consumerExport -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $consumerRoot | Out-Null
Copy-Item -LiteralPath $sourceExport -Destination $consumerExport -Recurse

$consumerScript = Join-Path $projectRoot "tools\conformance\consume-export.mjs"

Push-Location $flutterRootPath
try {
  node $consumerScript $consumerExport `
    --expect-pack runtime `
    --expect-pack provider `
    --expect-fixture sai-vn `
    --expect-provider gamecult.home.vn `
    --expect-runtime windows-flutter `
    --expect-runtime linux-flutter `
    --expect-runtime android-flutter `
    --expect-split-target EveFlutter
} finally {
  Pop-Location
}
