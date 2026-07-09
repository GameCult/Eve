param(
  [string] $HandoffPath = "tools\conformance\eveconformance-handoff.json",
  [string] $ManifestPath = "tools\parity\parity-manifest.json",
  [string] $ExportDirectory = "artifacts\conformance\latest"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteHandoffPath = if ([System.IO.Path]::IsPathRooted($HandoffPath)) {
  $HandoffPath
} else {
  Join-Path $projectRoot $HandoffPath
}
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($ManifestPath)) {
  $ManifestPath
} else {
  Join-Path $projectRoot $ManifestPath
}
$absoluteExportDirectory = if ([System.IO.Path]::IsPathRooted($ExportDirectory)) {
  $ExportDirectory
} else {
  Join-Path $projectRoot $ExportDirectory
}

if (-not (Test-Path -LiteralPath $absoluteHandoffPath)) {
  throw "EveConformance handoff manifest not found: $absoluteHandoffPath"
}
if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "Parity manifest not found: $absoluteManifestPath"
}

$handoff = Get-Content -LiteralPath $absoluteHandoffPath -Raw | ConvertFrom-Json
$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($handoff.schema -ne "gamecult.eve.conformance_handoff.v1") {
  throw "Unexpected EveConformance handoff schema: $($handoff.schema)"
}
if ($handoff.splitTarget -ne "EveConformance") {
  throw "Unexpected EveConformance handoff split target: $($handoff.splitTarget)"
}
if ($handoff.ownerRepo -ne "EveConformance") {
  throw "Unexpected EveConformance handoff owner: $($handoff.ownerRepo)"
}
if ($handoff.currentHostRepo -ne "Eve") {
  throw "Unexpected EveConformance handoff host: $($handoff.currentHostRepo)"
}

$expectedPath = $HandoffPath.Replace("\", "/")
if ($manifest.repoStrategy.conformanceHandoffPath -ne $expectedPath) {
  throw "Parity manifest does not point at EveConformance handoff. Expected $expectedPath got $($manifest.repoStrategy.conformanceHandoffPath)"
}

foreach ($id in @("conformance-runner", "conformance-schemas", "consumer-smokes", "fixture-corpus")) {
  $moveSet = @($handoff.moveSets) | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if (-not $moveSet) {
    throw "EveConformance handoff missing move set: $id"
  }
  if ($moveSet.destinationOwner -ne "EveConformance") {
    throw "EveConformance move set $id has unexpected destination owner: $($moveSet.destinationOwner)"
  }
  if (-not $moveSet.replacementProof) {
    throw "EveConformance move set $id missing replacement proof"
  }
  foreach ($relativePath in @($moveSet.currentPaths)) {
    $absolutePath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
      throw "EveConformance move set $id references missing current path: $relativePath"
    }
  }
}

foreach ($contract in @(
  "gamecult.eve.surface.v1",
  "gamecult.eve.command.v1",
  "gamecult.eve.command_receipt.v1",
  "gamecult.eve.conformance_export.v1",
  "gamecult.eve.conformance_handoff.v1",
  "gamecult.eve.capability_matrix.v1",
  "gamecult.eve.conformance_fixture.v1",
  "gamecult.eve.provider_scenario.v1",
  "gamecult.eve.plugin.v1",
  "gamecult.eve.plugin_receipt.v1",
  "gamecult.eve.plugin_advertisement.v1",
  "gamecult.eve.plugin_handoff.v1",
  "gamecult.eve.plugin_abi_fixture.v1",
  "gamecult.eve.plugin_abi.request.v1",
  "gamecult.eve.plugin_abi.response.v1",
  "gamecult.eve.runtime_release_request.v1",
  "gamecult.eve.runtime_capture_request.v1",
  "gamecult.eve.provider_advertisement.v1",
  "gamecult.eve.provider_handoff.v1",
  "gamecult.eve.electron_shell_projection.v1",
  "gamecult.eve.unity_scene_projection.v1",
  "gamecult.eve.tui_grid.v1",
  "gamecult.eve.web_layout_probe.v1",
  "gamecult.eve.runtime_capability.v1",
  "gamecult.eve.runtime_lifecycle.v1",
  "gamecult.eve.runtime_split_handoff.v1"
)) {
  if (-not (@($handoff.contractInputs) -contains $contract)) {
    throw "EveConformance handoff missing contract input: $contract"
  }
}

if (Test-Path -LiteralPath (Join-Path $absoluteExportDirectory "index.json")) {
  $export = Get-Content -LiteralPath (Join-Path $absoluteExportDirectory "index.json") -Raw | ConvertFrom-Json
  if ($export.conformanceHandoffPath -ne $expectedPath) {
    throw "Conformance export does not point at EveConformance handoff. Expected $expectedPath got $($export.conformanceHandoffPath)"
  }
  if (-not $export.conformanceHandoffExportPath) {
    throw "Conformance export missing EveConformance handoff export path"
  }
  if (-not (Test-Path -LiteralPath (Join-Path $absoluteExportDirectory $export.conformanceHandoffExportPath))) {
    throw "Conformance export missing EveConformance handoff document: $($export.conformanceHandoffExportPath)"
  }
  foreach ($packId in @("core", "plugin", "provider", "runtime")) {
    $pack = @($export.packs) | Where-Object { $_.id -eq $packId } | Select-Object -First 1
    if (-not $pack) {
      throw "Conformance export missing pack: $packId"
    }
  }
  foreach ($schemaId in @(
    "gamecult.eve.conformance_export.v1",
    "gamecult.eve.conformance_handoff.v1",
    "gamecult.eve.capability_matrix.v1",
    "gamecult.eve.conformance_fixture.v1",
    "gamecult.eve.provider_scenario.v1",
    "gamecult.eve.provider_advertisement.v1",
    "gamecult.eve.provider_handoff.v1",
    "gamecult.eve.electron_shell_projection.v1",
    "gamecult.eve.unity_scene_projection.v1",
    "gamecult.eve.tui_grid.v1",
    "gamecult.eve.web_layout_probe.v1",
    "gamecult.eve.runtime_capability.v1",
    "gamecult.eve.runtime_lifecycle.v1",
    "gamecult.eve.runtime_split_handoff.v1",
    "gamecult.eve.command_receipt.v1",
    "gamecult.eve.plugin.v1",
    "gamecult.eve.plugin_receipt.v1",
    "gamecult.eve.plugin_advertisement.v1",
    "gamecult.eve.plugin_handoff.v1",
    "gamecult.eve.plugin_abi_fixture.v1",
    "gamecult.eve.plugin_abi.request.v1",
    "gamecult.eve.plugin_abi.response.v1",
    "gamecult.eve.runtime_release_request.v1",
    "gamecult.eve.runtime_capture_request.v1"
  )) {
    $schema = @($export.schemaCatalog) | Where-Object { $_.schemaId -eq $schemaId } | Select-Object -First 1
    if (-not $schema) {
      throw "Conformance export schema catalog missing schema: $schemaId"
    }
    if (-not $schema.exportPath) {
      throw "Conformance export schema catalog missing export path for schema: $schemaId"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $absoluteExportDirectory $schema.exportPath))) {
      throw "Conformance export missing copied schema document for $($schemaId): $($schema.exportPath)"
    }
  }
}

foreach ($proof in @($handoff.requiredExternalProofs)) {
  if (-not $proof) {
    throw "EveConformance handoff contains an empty required external proof"
  }
}

Write-Host "EveConformance handoff smoke passed: $absoluteHandoffPath"
