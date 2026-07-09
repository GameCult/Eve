param(
  [string] $HandoffPath = "runtimes\incubating\eve-tui\evetui-split-handoff.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteHandoffPath = if ([System.IO.Path]::IsPathRooted($HandoffPath)) {
  $HandoffPath
} else {
  Join-Path $projectRoot $HandoffPath
}

if (-not (Test-Path -LiteralPath $absoluteHandoffPath)) {
  throw "EveTui split handoff manifest not found: $absoluteHandoffPath"
}

$handoff = Get-Content -LiteralPath $absoluteHandoffPath -Raw | ConvertFrom-Json

if ($handoff.schema -ne "gamecult.eve.runtime_split_handoff.v1") {
  throw "Unexpected EveTui split handoff schema: $($handoff.schema)"
}
if ($handoff.splitTarget -ne "EveTui") {
  throw "Unexpected EveTui split handoff target: $($handoff.splitTarget)"
}
if ($handoff.ownerRepo -ne "EveTui") {
  throw "Unexpected EveTui split handoff owner: $($handoff.ownerRepo)"
}
if ($handoff.currentHostRepo -ne "Eve") {
  throw "Unexpected EveTui split handoff host: $($handoff.currentHostRepo)"
}
if ($handoff.runtimeId -ne "tui") {
  throw "Unexpected EveTui split handoff runtime: $($handoff.runtimeId)"
}

$sourcePackageRoot = Join-Path $projectRoot $handoff.sourcePackageRoot
if (-not (Test-Path -LiteralPath $sourcePackageRoot)) {
  throw "EveTui source package root missing: $($handoff.sourcePackageRoot)"
}

$expectedMoveSets = @{
  "tui-runtime-body" = "runtime-body"
  "tui-world-surface-lowering" = "world-surface-lowering"
  "tui-command-transport" = "command"
  "tui-capture-lifecycle" = "capture"
}
$moveSets = @($handoff.moveSets)
foreach ($id in $expectedMoveSets.Keys) {
  $moveSet = $moveSets | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if (-not $moveSet) {
    throw "EveTui split handoff missing move set: $id"
  }
  if ($moveSet.stage -ne $expectedMoveSets[$id]) {
    throw "EveTui split handoff move set $id has unexpected stage: $($moveSet.stage)"
  }
  if ($moveSet.destinationOwner -ne "EveTui") {
    throw "EveTui split handoff move set $id has unexpected destination owner: $($moveSet.destinationOwner)"
  }
  if (-not $moveSet.replacementProof) {
    throw "EveTui split handoff move set $id missing replacement proof"
  }
  $currentPaths = if ($null -eq $moveSet.currentPaths) { @() } else { @($moveSet.currentPaths) }
  $observedProviderPaths = if ($null -eq $moveSet.observedProviderPaths) { @() } else { @($moveSet.observedProviderPaths) }
  if ($id -in @("tui-runtime-body", "tui-command-transport")) {
    if ($currentPaths.Count -eq 0) {
      throw "EveTui split handoff move set $id must name provider-shell skeleton paths"
    }
    foreach ($relativePath in $currentPaths) {
      $absolutePath = Join-Path $projectRoot $relativePath
      if (-not (Test-Path -LiteralPath $absolutePath)) {
        throw "EveTui split handoff move set $id references missing current path: $relativePath"
      }
    }
  } elseif ($currentPaths.Count -ne 0) {
    throw "EveTui split handoff move set $id must not claim existing Eve source paths before its proof exists"
  }
  if ($observedProviderPaths.Count -ne 0) {
    throw "EveTui split handoff move set $id must not treat provider product paths as generic TUI runtime source"
  }
}

foreach ($contract in @(
  "gamecult.eve.surface.v1",
  "gamecult.eve.command.v1",
  "gamecult.eve.provider_advertisement.v1",
  "gamecult.eve.plugin_advertisement.v1",
  "gamecult.eve.plugin.v1",
  "gamecult.eve.conformance_export.v1"
)) {
  if (-not (@($handoff.contractInputs) -contains $contract)) {
    throw "EveTui split handoff missing contract input: $contract"
  }
}

foreach ($forbiddenImport in @(
  "provider internals as TUI runtime authority",
  "renderer-local product state as provider truth",
  "terminal-only command routes that bypass gamecult.eve.command.v1",
  "plugin semantic internals",
  "lossy text summaries pretending to be provider state"
)) {
  if (-not (@($handoff.forbiddenImports) -contains $forbiddenImport)) {
    throw "EveTui split handoff missing forbidden import: $forbiddenImport"
  }
}

foreach ($proof in @($handoff.requiredExternalProofs)) {
  if (-not $proof) {
    throw "EveTui split handoff contains an empty required external proof"
  }
}

Write-Host "EveTui split handoff smoke passed: $absoluteHandoffPath"
