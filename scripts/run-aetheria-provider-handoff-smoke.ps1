param(
  [string] $HandoffPath = "web\fixtures\aetheria-provider-handoff.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteHandoffPath = if ([System.IO.Path]::IsPathRooted($HandoffPath)) {
  $HandoffPath
} else {
  Join-Path $projectRoot $HandoffPath
}

if (-not (Test-Path -LiteralPath $absoluteHandoffPath)) {
  throw "Aetheria provider handoff manifest not found: $absoluteHandoffPath"
}

$handoff = Get-Content -LiteralPath $absoluteHandoffPath -Raw | ConvertFrom-Json

if ($handoff.schema -ne "gamecult.eve.provider_handoff.v1") {
  throw "Unexpected Aetheria provider handoff schema: $($handoff.schema)"
}
if ($handoff.providerId -ne "aetheria") {
  throw "Unexpected Aetheria provider handoff provider: $($handoff.providerId)"
}
if ($handoff.ownerRepo -ne "Aetheria") {
  throw "Unexpected Aetheria provider handoff owner: $($handoff.ownerRepo)"
}
if ($handoff.currentHostRepo -ne "Eve") {
  throw "Unexpected Aetheria provider handoff host: $($handoff.currentHostRepo)"
}

foreach ($pathProperty in @("advertisementPath", "scenarioPath")) {
  $relativePath = $handoff.$pathProperty
  if (-not $relativePath) {
    throw "Aetheria provider handoff missing $pathProperty"
  }
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "Aetheria provider handoff references missing $($pathProperty): $relativePath"
  }
}

$advertisement = Get-Content -LiteralPath (Join-Path $projectRoot $handoff.advertisementPath) -Raw | ConvertFrom-Json
$scenario = Get-Content -LiteralPath (Join-Path $projectRoot $handoff.scenarioPath) -Raw | ConvertFrom-Json

if ($advertisement.providerId -ne $handoff.providerId) {
  throw "Aetheria handoff provider does not match advertisement provider: $($advertisement.providerId)"
}
if ($scenario.providerId -ne $handoff.providerId) {
  throw "Aetheria handoff provider does not match scenario provider: $($scenario.providerId)"
}
if ($scenario.ownerRepo -ne $handoff.ownerRepo) {
  throw "Aetheria scenario owner does not match handoff owner: $($scenario.ownerRepo)"
}

foreach ($fixtureId in @($handoff.fixtureIds)) {
  if (-not (@($scenario.requires.fixtures) -contains $fixtureId)) {
    throw "Aetheria provider handoff fixture is not required by scenario: $fixtureId"
  }
}

$moveSets = @($handoff.moveSets)
foreach ($id in @("provider-advertisement", "interactive-world-surface", "provider-scenario")) {
  $moveSet = $moveSets | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if (-not $moveSet) {
    throw "Aetheria provider handoff missing move set: $id"
  }
  if ($moveSet.destinationOwner -ne "Aetheria") {
    throw "Aetheria provider handoff move set $id has unexpected destination owner: $($moveSet.destinationOwner)"
  }
  if (-not $moveSet.replacementProof) {
    throw "Aetheria provider handoff move set $id missing replacement proof"
  }
  foreach ($relativePath in @($moveSet.currentPaths)) {
    $absolutePath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
      throw "Aetheria provider handoff move set $id references missing current path: $relativePath"
    }
  }
}

foreach ($contract in @(
  "gamecult.eve.surface.v1",
  "gamecult.eve.command.v1",
  "gamecult.eve.provider_advertisement.v1",
  "gamecult.eve.provider_scenario.v1",
  "gamecult.eve.conformance_export.v1"
)) {
  if (-not (@($handoff.contractInputs) -contains $contract)) {
    throw "Aetheria provider handoff missing contract input: $contract"
  }
}

foreach ($proof in @($handoff.requiredExternalProofs)) {
  if (-not $proof) {
    throw "Aetheria provider handoff contains an empty required external proof"
  }
}

Write-Host "Aetheria provider handoff smoke passed: $absoluteHandoffPath"
