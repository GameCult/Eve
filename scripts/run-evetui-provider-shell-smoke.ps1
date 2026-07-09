param(
  [string] $CapabilityManifestPath = "runtimes\incubating\eve-tui\eve-runtime-capability.json"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteManifestPath = if ([System.IO.Path]::IsPathRooted($CapabilityManifestPath)) {
  $CapabilityManifestPath
} else {
  Join-Path $projectRoot $CapabilityManifestPath
}

if (-not (Test-Path -LiteralPath $absoluteManifestPath)) {
  throw "EveTui runtime capability manifest not found: $absoluteManifestPath"
}

$manifest = Get-Content -LiteralPath $absoluteManifestPath -Raw | ConvertFrom-Json

if ($manifest.runtimeId -ne "tui") {
  throw "Unexpected EveTui runtime id: $($manifest.runtimeId)"
}
if ($manifest.lifecycle.test.status -ne "provider-shell-contract-skeleton") {
  throw "Unexpected EveTui provider shell status: $($manifest.lifecycle.test.status)"
}

foreach ($feature in @("providerAdvertisements", "commandTransport", "terminalGridSummary")) {
  if (-not (@($manifest.supportedFeatures) -contains $feature)) {
    throw "EveTui provider shell missing supported feature: $feature"
  }
}

$expectedFiles = @(
  "runtimes\incubating\eve-tui\package.json",
  "runtimes\incubating\eve-tui\src\eve-tui-shell.mjs",
  "runtimes\incubating\eve-tui\test\eve-tui-shell.test.mjs"
)

foreach ($relativePath in $expectedFiles) {
  $absolutePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $absolutePath)) {
    throw "EveTui provider shell missing file: $relativePath"
  }
}

$shellSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-tui\src\eve-tui-shell.mjs") -Raw
foreach ($symbol in @("EveTuiShell", "selectSurface", "createCommandIntent", "renderSummary", "gamecult.eve.tui_grid.v1", "commandBoundary", "receiptSchema")) {
  if (-not $shellSource.Contains($symbol)) {
    throw "EveTui provider shell source missing symbol: $symbol"
  }
}

$testSource = Get-Content -LiteralPath (Join-Path $projectRoot "runtimes\incubating\eve-tui\test\eve-tui-shell.test.mjs") -Raw
foreach ($symbol in @("selects advertised provider surfaces", "command intents carry provider-advertised boundaries", "summary grid is explicitly lossy", "aetheria.daemon.commands")) {
  if (-not $testSource.Contains($symbol)) {
    throw "EveTui provider shell test missing symbol: $symbol"
  }
}

Push-Location (Join-Path $projectRoot "runtimes\incubating\eve-tui")
try {
  npm test
  if ($LASTEXITCODE -ne 0) {
    throw "EveTui provider shell tests failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

Write-Host "EveTui provider shell smoke passed: $absoluteManifestPath"
