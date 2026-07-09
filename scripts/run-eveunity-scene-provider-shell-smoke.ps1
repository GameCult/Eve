param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-unity-scene\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveUnity scene runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "unity-scene") {
  throw "Unexpected EveUnity scene runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveUnity scene provider shell status: $($manifest.lifecycle.test.status)"
}

$worldSurfaceLoweringClaims = if ($null -eq $manifest.worldSurfaceLowering) { @() } else { @($manifest.worldSurfaceLowering) }
if ($worldSurfaceLoweringClaims.Count -ne 0) {
  throw "EveUnity scene must not claim provider world-surface lowering until real scene projection and capture evidence exist"
}

foreach ($feature in @("providerAdvertisements", "commandTransport")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveUnity scene provider shell missing supported feature: $feature"
  }
}

$expectedFiles = @(
  "runtimes\incubating\eve-unity-scene\package.json",
  "runtimes\incubating\eve-unity-scene\Runtime\GameCult.Eve.UnityScene.asmdef",
  "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneSurfaceLowerer.cs",
  "runtimes\incubating\eve-unity-scene\Tests\Editor\GameCult.Eve.UnityScene.Tests.asmdef",
  "runtimes\incubating\eve-unity-scene\Tests\Editor\EveUnitySceneSurfaceLowererTests.cs"
)

foreach ($relativePath in $expectedFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveUnity scene provider shell missing file: $relativePath"
  }
}

$lowererSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Runtime\EveUnitySceneSurfaceLowerer.cs") -Raw
foreach ($symbol in @("EveUnitySceneSurfaceLowerer", "EveUnitySceneProviderSurfaceAdvertisement", "WorldInteraction", "CommandBoundary", "ReceiptSchema", "EveSurfaceCommandRequest", "unity-scene")) {
  if (-not $lowererSource.Contains($symbol)) {
    throw "EveUnity scene provider shell lowerer missing symbol: $symbol"
  }
}

$testSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-unity-scene\Tests\Editor\EveUnitySceneSurfaceLowererTests.cs") -Raw
foreach ($symbol in @("LowerCarriesProviderAdvertisedWorldBoundary", "CommandIntentCarriesAdvertisedBoundaryWithoutOwningReceipts", "aetheria.daemon.commands", "aetheria.eve_command_acceptance_status.v1")) {
  if (-not $testSource.Contains($symbol)) {
    throw "EveUnity scene provider shell tests missing symbol: $symbol"
  }
}

Write-Host "EveUnity scene provider shell smoke passed: $absoluteManifestPath"
