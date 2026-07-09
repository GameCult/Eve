param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-electron\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveElectron runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "electron-shell") {
  throw "Unexpected EveElectron runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveElectron provider shell status: $($manifest.lifecycle.test.status)"
}

foreach ($feature in @("providerAdvertisements", "commandTransport")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveElectron provider shell missing supported feature: $feature"
  }
}

$expectedFiles = @(
  "runtimes\incubating\eve-electron\package.json",
  "runtimes\incubating\eve-electron\src\eve-electron-shell.mjs",
  "runtimes\incubating\eve-electron\test\eve-electron-shell.test.mjs"
)

foreach ($relativePath in $expectedFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveElectron provider shell missing file: $relativePath"
  }
}

$shellSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-electron\src\eve-electron-shell.mjs") -Raw
foreach ($symbol in @("EveElectronShell", "selectSurface", "createCommandIntent", "worldInteraction", "commandBoundary", "receiptSchema", "electron-shell")) {
  if (-not $shellSource.Contains($symbol)) {
    throw "EveElectron provider shell source missing symbol: $symbol"
  }
}

$testSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-electron\test\eve-electron-shell.test.mjs") -Raw
foreach ($symbol in @("selects the active advertised provider surface", "command intents carry provider-advertised boundaries", "aetheria.daemon.commands", "aetheria.eve_command_acceptance_status.v1")) {
  if (-not $testSource.Contains($symbol)) {
    throw "EveElectron provider shell test missing symbol: $symbol"
  }
}

Push-Location (Join-Path $projectRoot "runtimes\incubating\eve-electron")
try {
  npm test
  if ($LASTEXITCODE -ne 0) {
    throw "EveElectron provider shell tests failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "EveElectron provider shell smoke passed: $absoluteManifestPath"
