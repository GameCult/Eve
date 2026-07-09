param(
  [string] $ProviderId = "gamecult.eve.embedded-demo",
  [string] $FixtureId = "embedded-surface",
  [string] $OutputPath = "artifacts\web-reference-layout-probe\latest\embedded-surface.json",
  [int] $Port = 8892,
  [int] $Width = 1280,
  [int] $Height = 720,
  [switch] $SkipBuild
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $OutputPath
} else {
  Join-Path $projectRoot $OutputPath
}

Push-Location $projectRoot
try {
  if (-not $SkipBuild) {
    npm --prefix packages/eve-browser-lowering run build | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "Eve browser lowering build failed with exit code $LASTEXITCODE"
    }
  }

  node .\tools\web-reference\run-layout-probe.mjs `
    --provider $ProviderId `
    --fixture $FixtureId `
    --output $OutputPath `
    --port $Port `
    --width $Width `
    --height $Height | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Web reference layout probe failed with exit code $LASTEXITCODE"
  }

  if (-not (Test-Path $absoluteOutputPath)) {
    throw "Web reference layout probe did not write output: $absoluteOutputPath"
  }
  $probe = Get-Content $absoluteOutputPath -Raw | ConvertFrom-Json
  if ($probe.schema -ne "gamecult.eve.web_layout_probe.v1") {
    throw "Unexpected web layout probe schema: $($probe.schema)"
  }
  if ($probe.runtimeId -ne "web") {
    throw "Unexpected web layout probe runtime: $($probe.runtimeId)"
  }
  if ($probe.providerId -ne $ProviderId) {
    throw "Unexpected web layout probe provider: $($probe.providerId)"
  }
  if ($probe.fixtureId -ne $FixtureId) {
    throw "Unexpected web layout probe fixture: $($probe.fixtureId)"
  }
  if ($probe.summary.measuredNodeCount -le 0) {
    throw "Web layout probe measured no node boxes."
  }
  Write-Host "Web reference layout probe smoke passed: $absoluteOutputPath"
} finally {
  Pop-Location
}
