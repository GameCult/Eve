param(
  [string] $CapabilityManifestPath = "packages\org.gamecult.eve.unity-uitoolkit\eve-runtime-capability.json",
  [switch] $RunUnityEditMode
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveUnity runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.schema -ne "gamecult.eve.runtime_capability.v1") {
  throw "Unexpected EveUnity manifest schema: $($manifest.schema)"
}
if ($manifest.runtimeId -ne "unity-uitoolkit") {
  throw "Unexpected EveUnity runtime id: $($manifest.runtimeId)"
}
if ($manifest.owner -ne "EveUnity") {
  throw "Unexpected EveUnity owner: $($manifest.owner)"
}
if ($manifest.incubation.ownerRepo -ne "EveUnity") {
  throw "Unexpected EveUnity incubation owner: $($manifest.incubation.ownerRepo)"
}
if ($manifest.incubation.currentHostRepo -ne "Eve") {
  throw "Unexpected EveUnity current host repo: $($manifest.incubation.currentHostRepo)"
}
if ($manifest.incubation.splitTarget -ne "EveUnity") {
  throw "Unexpected EveUnity split target: $($manifest.incubation.splitTarget)"
}

foreach ($feature in @("embeddedDocuments")) {
  if (-not ($manifest.supportedFeatures -contains $feature)) {
    throw "EveUnity manifest missing supported feature: $feature"
  }
}

$pluginClaims = @{}
foreach ($plugin in $manifest.supportedPlugins) {
  $pluginClaims[$plugin.pluginId] = @($plugin.capabilities)
}
foreach ($claim in @(
  @{ pluginId = "sai.vn"; capabilities = @("vn.stage", "story.choose", "story.continue", "story.jump") },
  @{ pluginId = "norn.graph"; capabilities = @("embed.norn") }
)) {
  if (-not $pluginClaims.ContainsKey($claim.pluginId)) {
    throw "EveUnity manifest missing plugin claim: $($claim.pluginId)"
  }
  foreach ($capability in $claim.capabilities) {
    if (-not ($pluginClaims[$claim.pluginId] -contains $capability)) {
      throw "EveUnity manifest missing plugin capability: $($claim.pluginId):$capability"
    }
  }
}

if ($manifest.commandTransport.schema -ne "gamecult.eve.command.v1") {
  throw "Unexpected EveUnity command schema: $($manifest.commandTransport.schema)"
}

foreach ($stage in @("release", "test", "capture")) {
  $stageDocument = $manifest.lifecycle.$stage
  if ($null -eq $stageDocument) {
    throw "EveUnity lifecycle missing stage: $stage"
  }
  if ($stageDocument.ownerRepo -ne "EveUnity") {
    throw "EveUnity lifecycle stage $stage has unexpected owner: $($stageDocument.ownerRepo)"
  }
  if (-not $stageDocument.status) {
    throw "EveUnity lifecycle stage $stage missing status"
  }
  foreach ($evidencePath in $stageDocument.evidencePaths) {
    $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
    if (-not (Test-Path -LiteralPath $absoluteEvidencePath)) {
      throw "EveUnity lifecycle stage $stage missing evidence path: $evidencePath"
    }
  }
}

& (Join-Path $projectRoot "scripts\run-aetheria-unity-package-smoke.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "Aetheria Unity package smoke failed with exit code $LASTEXITCODE"
}

if ($RunUnityEditMode) {
  & (Join-Path $projectRoot "scripts\run-aetheria-unity-editmode-tests.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Aetheria Unity EditMode smoke failed with exit code $LASTEXITCODE"
  }
}

Write-Host "EveUnity lifecycle smoke passed: $absoluteManifestPath"
