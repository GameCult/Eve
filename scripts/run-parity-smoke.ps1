param(
  [string] $ProviderId = "eve.cultui.inspector",
  [string] $OutputDirectory = "artifacts\parity-smoke",
  [string] $IosSshTarget = "eve"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runRoot = Join-Path $projectRoot (Join-Path $OutputDirectory $stamp)
New-Item -ItemType Directory -Force $runRoot | Out-Null
$manifest = Get-Content (Join-Path $projectRoot "tools\parity\parity-manifest.json") | ConvertFrom-Json
$responsiveCases = @($manifest.responsiveCases)

$results = [ordered]@{
  schema = "gamecult.eve.parity_smoke.v1"
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  providerId = $ProviderId
  outputDirectory = $runRoot
  targets = @()
}

function Add-TargetResult {
  param(
    [string] $Id,
    [string] $Status,
    [string] $Screenshot = "",
    [string] $ErrorMessage = ""
  )

  $results.targets += [ordered]@{
    id = $Id
    status = $Status
    screenshot = $Screenshot
    error = $ErrorMessage
  }
}

function Invoke-Capture {
  param(
    [string] $Id,
    [scriptblock] $Capture
  )

  try {
    $screenshot = & $Capture
    if ($LASTEXITCODE -ne 0) {
      throw "capture command exited with code $LASTEXITCODE"
    }
    Add-TargetResult -Id $Id -Status "pass" -Screenshot ($screenshot | Select-Object -Last 1)
  } catch {
    Add-TargetResult -Id $Id -Status "fail" -ErrorMessage $_.Exception.Message
  }
}

Push-Location $projectRoot
try {
  powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-harness.ps1 -OutputDirectory (Join-Path $runRoot "semantic") | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Semantic parity harness failed with exit code $LASTEXITCODE"
  }

  foreach ($case in $responsiveCases) {
    Invoke-Capture "web-$($case.id)" {
      powershell -ExecutionPolicy Bypass -File .\scripts\capture-web-reference.ps1 `
        -ProviderId $ProviderId `
        -OutputPath (Join-Path $runRoot "web-$ProviderId-$($case.id).png") `
        -Width $case.width `
        -Height $case.height
    }
  }

  Invoke-Capture "ios" {
    powershell -ExecutionPolicy Bypass -File .\scripts\capture-eve-screenshot.ps1 `
      -Target $IosSshTarget `
      -OutputDirectory $runRoot
  }

  foreach ($case in $responsiveCases) {
    Invoke-Capture "android-$($case.id)" {
      powershell -ExecutionPolicy Bypass -File .\scripts\capture-android-screenshot.ps1 `
        -OutputPath (Join-Path $runRoot "android-periwinkle-$($case.id).png") `
        -Width $case.width `
        -Height $case.height `
        -Orientation $case.orientation
    }
  }

  foreach ($case in $responsiveCases) {
    Invoke-Capture "windows-$($case.id)" {
      powershell -ExecutionPolicy Bypass -File .\scripts\capture-flutter-parity.ps1 `
        -Target windows `
        -ViewportId $case.id `
        -OutputPath (Join-Path $runRoot "windows-flutter-cultui-inspector-$($case.id).png")
    }
  }

  foreach ($case in $responsiveCases) {
    Invoke-Capture "linux-$($case.id)" {
      powershell -ExecutionPolicy Bypass -File .\scripts\capture-flutter-parity.ps1 `
        -Target linux `
        -ViewportId $case.id `
        -OutputPath (Join-Path $runRoot "linux-flutter-cultui-inspector-$($case.id).png")
    }
  }

  $jsonPath = Join-Path $runRoot "parity-smoke.json"
  $mdPath = Join-Path $runRoot "parity-smoke.md"
  $results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

  $lines = @(
    "# Eve Parity Smoke",
    "",
    "Generated: $($results.generatedAt)",
    "Provider: $ProviderId",
    "",
    "| Target | Status | Screenshot | Error |",
    "| --- | --- | --- | --- |"
  )
  foreach ($target in $results.targets) {
    $lines += "| $($target.id) | $($target.status) | $($target.screenshot) | $($target.error) |"
  }
  $lines -join "`n" | Set-Content -LiteralPath $mdPath -Encoding UTF8

  Write-Host "Parity smoke report: $mdPath"
  $failed = @($results.targets | Where-Object { $_.status -ne "pass" })
  if ($failed.Count -gt 0) {
    throw "$($failed.Count) parity smoke target(s) failed: $($failed.id -join ', ')"
  }
} finally {
  Pop-Location
}
