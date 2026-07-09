param(
  [string] $HandoffPath = "runtimes\incubating\eve-electron\eveelectron-split-handoff.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteHandoffPath = if ([System.IO.Path]::IsPathRooted($HandoffPath)) {
  $HandoffPath
} else {
  Join-Path $projectRoot $HandoffPath
}

if (-not (Test-Path -LiteralPath $absoluteHandoffPath)) {
  throw "EveElectron split handoff manifest not found: $absoluteHandoffPath"
}

$handoff = Get-Content -LiteralPath $absoluteHandoffPath -Raw | ConvertFrom-Json

if ($handoff.schema -ne "gamecult.eve.runtime_split_handoff.v1") {
  throw "Unexpected EveElectron split handoff schema: $($handoff.schema)"
}
if ($handoff.splitTarget -ne "EveElectron") {
  throw "Unexpected EveElectron split handoff target: $($handoff.splitTarget)"
}
if ($handoff.ownerRepo -ne "EveElectron") {
  throw "Unexpected EveElectron split handoff owner: $($handoff.ownerRepo)"
}
if ($handoff.currentHostRepo -ne "Eve") {
  throw "Unexpected EveElectron split handoff host: $($handoff.currentHostRepo)"
}
if ($handoff.runtimeId -ne "electron-shell") {
  throw "Unexpected EveElectron split handoff runtime: $($handoff.runtimeId)"
}

$moveSets = @($handoff.moveSets)
foreach ($stage in @("runtime-body", "command", "world-surface-lowering", "plugin-projection", "capture")) {
  $moveSet = $moveSets | Where-Object { $_.stage -eq $stage } | Select-Object -First 1
  if (-not $moveSet) {
    throw "EveElectron split handoff missing move set for stage: $stage"
  }
  if ($moveSet.destinationOwner -ne "EveElectron") {
    throw "EveElectron split handoff stage $stage has unexpected destination owner: $($moveSet.destinationOwner)"
  }
  if (-not $moveSet.replacementProof) {
    throw "EveElectron split handoff stage $stage missing replacement proof"
  }
  foreach ($relativePath in @($moveSet.currentPaths)) {
    $absolutePath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $absolutePath)) {
      throw "EveElectron split handoff stage $stage references missing current path: $relativePath"
    }
  }
}

foreach ($id in @("electron-shell-runtime", "electron-command-transport", "electron-world-surface-lowering")) {
  $moveSet = $moveSets | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if (-not $moveSet) {
    throw "EveElectron split handoff missing move set: $id"
  }
  $observedPaths = @($moveSet.observedProviderPaths)
  if ($observedPaths.Count -eq 0) {
    throw "EveElectron split handoff move set $id must name observed Aetheria paths to replace"
  }
  foreach ($path in $observedPaths) {
    if (-not (Test-Path -LiteralPath $path)) {
      throw "EveElectron split handoff observed provider path missing: $path"
    }
  }
}

$captureMoveSet = $moveSets | Where-Object { $_.id -eq "electron-capture-lifecycle" } | Select-Object -First 1
if (-not $captureMoveSet) {
  throw "EveElectron split handoff missing move set: electron-capture-lifecycle"
}
if (@($captureMoveSet.currentPaths).Count -eq 0) {
  throw "EveElectron capture lifecycle move set must declare currentPaths"
}

$pluginMoveSet = $moveSets | Where-Object { $_.id -eq "electron-plugin-projection" } | Select-Object -First 1
if (-not $pluginMoveSet) {
  throw "EveElectron split handoff missing move set: electron-plugin-projection"
}
foreach ($relativePath in @(
  "runtimes/incubating/eve-electron/src/eve-electron-shell.mjs",
  "runtimes/incubating/eve-electron/test/eve-electron-shell.test.mjs",
  "web/fixtures/sai-vn-surface.json"
)) {
  if (-not (@($pluginMoveSet.currentPaths) -contains $relativePath)) {
    throw "EveElectron plugin projection move set missing current path: $relativePath"
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
    throw "EveElectron split handoff missing contract input: $contract"
  }
}

foreach ($proof in @($handoff.requiredExternalProofs)) {
  if (-not $proof) {
    throw "EveElectron split handoff contains an empty required external proof"
  }
}

foreach ($forbiddenImport in @(
  "Sai story state, VN/Ink semantics, or story command interpretation as Electron shell authority",
  "Norn graph layout, graph state, or command semantics as Electron shell authority",
  "TeX parsing, typesetting, baseline metrics, or render-cache semantics as Electron shell authority"
)) {
  if (-not (@($handoff.forbiddenImports) -contains $forbiddenImport)) {
    throw "EveElectron split handoff missing forbidden import: $forbiddenImport"
  }
}

Write-Host "EveElectron split handoff smoke passed: $absoluteHandoffPath"
