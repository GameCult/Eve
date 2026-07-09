param(
  [string] $ExportDirectory = "artifacts\conformance\latest",
  [string] $AetheriaRoot = "E:\Projects\Aetheria",
  [string] $ConsumerDirectory = "artifacts\aetheria-conformance-consumer-smoke"
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
if (-not (Test-Path $AetheriaRoot)) {
  throw "Aetheria repo not found: $AetheriaRoot"
}

if (Test-Path $consumerExport) {
  Remove-Item -LiteralPath $consumerExport -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $consumerRoot | Out-Null
Copy-Item -LiteralPath $sourceExport -Destination $consumerExport -Recurse

$consumerScript = Join-Path $projectRoot "tools\conformance\consume-export.mjs"

Push-Location $AetheriaRoot
try {
  node $consumerScript $consumerExport `
    --expect-pack provider `
    --expect-fixture aetheria-world `
    --expect-provider aetheria `
    --expect-scenario aetheria-world-command-replay `
    --expect-provider-surface aetheria:aetheria.daemon.game `
    --expect-provider-surface aetheria:aetheria.daemon.editor `
    --expect-provider-surface-kind aetheria:aetheria.daemon.game:interactive-world `
    --expect-provider-surface-kind aetheria:aetheria.daemon.editor:interactive-world-editor `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.projectionKind:provider-authored-world-surface `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.commandBoundary:aetheria.daemon.commands `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.receiptSchema:aetheria.eve_command_acceptance_status.v1 `
    --expect-provider-surface-field aetheria:aetheria.daemon.game:worldInteraction.ownership:provider-owns-world-state-assets-command-acceptance-and-receipts `
    --expect-provider-surface-field aetheria:aetheria.daemon.editor:worldInteraction.projectionKind:provider-authored-world-editor-surface `
    --expect-provider-surface-field aetheria:aetheria.daemon.editor:worldInteraction.commandBoundary:aetheria.daemon.commands `
    --expect-provider-surface-field aetheria:aetheria.daemon.editor:worldInteraction.receiptSchema:aetheria.eve_command_acceptance_status.v1 `
    --expect-provider-command aetheria:aetheria.daemon.commands `
    --expect-provider-receipt-state aetheria:accepted `
    --expect-provider-receipt-state aetheria:reconciled `
    --expect-provider-handoff aetheria
  if ($LASTEXITCODE -ne 0) {
    throw "Aetheria conformance consumer smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
