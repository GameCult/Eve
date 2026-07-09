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
    --expect-capability-gap "split-target:EveUnity:EveUnity:proof:Tagged UPM release" `
    --expect-conformance-handoff
  if ($LASTEXITCODE -ne 0) {
    throw "Conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
