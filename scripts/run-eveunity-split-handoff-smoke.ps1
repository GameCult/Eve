param(
  [string] $HandoffPath = "packages\org.gamecult.eve.unity-uitoolkit\eveunity-split-handoff.json",
  [string] $CapabilityPath = "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteHandoffPath = if ([System.IO.Path]::IsPathRooted($HandoffPath)) {
  $HandoffPath
} else {
  Join-Path $projectRoot $HandoffPath
}
$absoluteCapabilityPath = if ([System.IO.Path]::IsPathRooted($CapabilityPath)) {
  $CapabilityPath
} else {
  Join-Path $projectRoot $CapabilityPath
}

if (-not (Test-Path -LiteralPath $absoluteHandoffPath)) {
  throw "EveUnity split handoff manifest not found: $absoluteHandoffPath"
}
if (-not (Test-Path -LiteralPath $absoluteCapabilityPath)) {
  throw "EveUnity runtime capability manifest not found: $absoluteCapabilityPath"
}

$handoff = Get-Content -LiteralPath $absoluteHandoffPath -Raw | ConvertFrom-Json
$capability = Get-Content -LiteralPath $absoluteCapabilityPath -Raw | ConvertFrom-Json

if ($handoff.schema -ne "gamecult.eve.runtime_split_handoff.v1") {
  throw "Unexpected EveUnity split handoff schema: $($handoff.schema)"
}
if ($handoff.splitTarget -ne "EveUnity") {
  throw "Unexpected EveUnity split handoff target: $($handoff.splitTarget)"
}
if ($handoff.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity split handoff owner: $($handoff.ownerRepo)"
}
if ($handoff.currentHostRepo -ne "Eve") {
  throw "Unexpected EveUnity split handoff host: $($handoff.currentHostRepo)"
}
if ($handoff.runtimeId -ne "unity-uitoolkit") {
  throw "Unexpected EveUnity split handoff runtime: $($handoff.runtimeId)"
}
if ($capability.incubation.splitHandoff.manifestPath -ne $HandoffPath.Replace("\", "/")) {
  $expectedPath = $HandoffPath.Replace("\", "/")
  throw "EveUnity capability manifest does not point at split handoff. Expected $expectedPath got $($capability.incubation.splitHandoff.manifestPath)"
}

$expectedStages = @("release", "test", "capture")
foreach ($stage in $expectedStages) {
  if (-not $capability.lifecycle.$stage) {
    throw "EveUnity capability lifecycle missing stage: $stage"
  }
}

$moveSets = @($handoff.moveSets)
foreach ($stage in $expectedStages) {
  $moveSet = $moveSets | Where-Object { $_.stage -eq $stage } | Select-Object -First 1
  if (-not $moveSet) {
    throw "EveUnity split handoff missing move set for stage: $stage"
  }
  if ($moveSet.destinationOwner -ne "EveUnity") {
    throw "EveUnity split handoff stage $stage has unexpected destination owner: $($moveSet.destinationOwner)"
  }
  if (-not $moveSet.replacementProof) {
    throw "EveUnity split handoff stage $stage missing replacement proof"
  }

  $pendingProofs = @($capability.lifecycle.$stage.pendingProofs)
  if (-not ($pendingProofs -contains $moveSet.replacementProof)) {
    throw "EveUnity split handoff stage $stage replacement proof is not mirrored in runtime capability pending proofs: $($moveSet.replacementProof)"
  }

  foreach ($relativePath in @($moveSet.currentPaths)) {
    $absolutePath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
      throw "EveUnity split handoff stage $stage references missing current path: $relativePath"
    }
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
    throw "EveUnity split handoff missing contract input: $contract"
  }
}

foreach ($proof in @($handoff.requiredExternalProofs)) {
  if (-not $proof) {
    throw "EveUnity split handoff contains an empty required external proof"
  }
}

Write-Host "EveUnity split handoff smoke passed: $absoluteHandoffPath"
