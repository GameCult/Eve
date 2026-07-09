param(
  [string] $HandoffPath = "runtimes\incubating\eve-unity-scene\eveunity-scene-split-handoff.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteHandoffPath = if ([System.IO.Path]::IsPathRooted($HandoffPath)) {
  $HandoffPath
} else {
  Join-Path $projectRoot $HandoffPath
}

if (-not (Test-Path -LiteralPath $absoluteHandoffPath)) {
  throw "EveUnity scene split handoff manifest not found: $absoluteHandoffPath"
}

$handoff = Get-Content -LiteralPath $absoluteHandoffPath -Raw | ConvertFrom-Json

if ($handoff.schema -ne "gamecult.eve.runtime_split_handoff.v1") {
  throw "Unexpected EveUnity scene split handoff schema: $($handoff.schema)"
}
if ($handoff.splitTarget -ne "EveUnity") {
  throw "Unexpected EveUnity scene split handoff target: $($handoff.splitTarget)"
}
if ($handoff.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity scene split handoff owner: $($handoff.ownerRepo)"
}
if ($handoff.currentHostRepo -ne "Eve") {
  throw "Unexpected EveUnity scene split handoff host: $($handoff.currentHostRepo)"
}
if ($handoff.runtimeId -ne "unity-scene") {
  throw "Unexpected EveUnity scene split handoff runtime: $($handoff.runtimeId)"
}
if ($handoff.packageName -ne "org.gamecult.eve.unity-scene") {
  throw "Unexpected EveUnity scene package name: $($handoff.packageName)"
}

$sourcePackageRoot = Join-Path $projectRoot $handoff.sourcePackageRoot
if (-not (Test-Path -LiteralPath $sourcePackageRoot)) {
  throw "EveUnity scene source package root missing: $($handoff.sourcePackageRoot)"
}

$moveSets = @($handoff.moveSets)
$expectedMoveSets = @{
  "unity-scene-runtime-body" = "runtime-body"
  "unity-scene-world-surface-lowering" = "world-surface-lowering"
  "unity-scene-command-transport" = "command"
  "unity-scene-capture-lifecycle" = "capture"
}

foreach ($id in $expectedMoveSets.Keys) {
  $moveSet = $moveSets | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if (-not $moveSet) {
    throw "EveUnity scene split handoff missing move set: $id"
  }
  if ($moveSet.stage -ne $expectedMoveSets[$id]) {
    throw "EveUnity scene split handoff move set $id has unexpected stage: $($moveSet.stage)"
  }
  if ($moveSet.destinationOwner -ne "EveUnity") {
    throw "EveUnity scene split handoff move set $id has unexpected destination owner: $($moveSet.destinationOwner)"
  }
  if (-not $moveSet.replacementProof) {
    throw "EveUnity scene split handoff move set $id missing replacement proof"
  }
  $currentPaths = if ($null -eq $moveSet.currentPaths) { @() } else { @($moveSet.currentPaths) }
  $observedProviderPaths = if ($null -eq $moveSet.observedProviderPaths) { @() } else { @($moveSet.observedProviderPaths) }
  if ($id -in @("unity-scene-runtime-body", "unity-scene-world-surface-lowering", "unity-scene-command-transport", "unity-scene-capture-lifecycle")) {
    if ($currentPaths.Count -eq 0) {
      throw "EveUnity scene split handoff move set $id must name current Eve incubation paths"
    }
    foreach ($relativePath in $currentPaths) {
      $absolutePath = Join-Path $projectRoot $relativePath
      if (-not (Test-Path -LiteralPath $absolutePath)) {
        throw "EveUnity scene split handoff move set $id path missing: $relativePath"
      }
    }
  }
  if ($observedProviderPaths.Count -ne 0) {
    throw "EveUnity scene split handoff move set $id must not treat provider product paths as generic scene runtime source"
  }
}

foreach ($contract in @(
  "gamecult.eve.surface.v1",
  "gamecult.eve.command.v1",
  "gamecult.eve.provider_advertisement.v1",
  "gamecult.eve.runtime_capability.v1",
  "gamecult.eve.conformance_export.v1"
)) {
  if (-not (@($handoff.contractInputs) -contains $contract)) {
    throw "EveUnity scene split handoff missing contract input: $contract"
  }
}

foreach ($forbiddenImport in @(
  "Aetheria daemon state as Unity scene runtime authority",
  "Aetheria gameplay scripts as EveUnity scene lowerer truth",
  "provider-specific scene components that bypass gamecult.eve.command.v1",
  "renderer-local world simulation as provider truth",
  "product assets bundled as Eve runtime contract"
)) {
  if (-not (@($handoff.forbiddenImports) -contains $forbiddenImport)) {
    throw "EveUnity scene split handoff missing forbidden import: $forbiddenImport"
  }
}

foreach ($proof in @($handoff.requiredExternalProofs)) {
  if (-not $proof) {
    throw "EveUnity scene split handoff contains an empty required external proof"
  }
}

Write-Host "EveUnity scene split handoff smoke passed: $absoluteHandoffPath"
