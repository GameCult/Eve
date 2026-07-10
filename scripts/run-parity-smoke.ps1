param(
  [string] $ProviderId = "eve.cultui.inspector",
  [string] $OutputDirectory = "artifacts\parity-smoke",
  [string] $IosSshTarget = "eve",
  [string] $LinuxSshTarget = "nightwing"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runRoot = Join-Path $projectRoot (Join-Path $OutputDirectory $stamp)
New-Item -ItemType Directory -Force $runRoot | Out-Null
$manifest = Get-Content (Join-Path $projectRoot "tools\parity\parity-manifest.json") | ConvertFrom-Json
$responsiveCases = @($manifest.responsiveCases)
$androidDeviceCases = @($manifest.androidDeviceCases)

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

function Resolve-ContactSheetPython {
  $candidates = @()
  if ($env:EVE_PARITY_PYTHON) {
    $candidates += $env:EVE_PARITY_PYTHON
  }
  $candidates += @("python", "python3")

  foreach ($candidate in $candidates) {
    try {
      & $candidate -c "import PIL" *> $null
      if ($LASTEXITCODE -eq 0) {
        return $candidate
      }
    } catch {
    }
  }
  return $null
}

Push-Location $projectRoot
try {
  powershell -ExecutionPolicy Bypass -File .\scripts\run-parity-harness.ps1 -OutputDirectory (Join-Path $runRoot "semantic") | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Semantic parity harness failed with exit code $LASTEXITCODE"
  }
  $flutterSurface = Join-Path $runRoot "flutter-current-surface.json"
  node .\tools\parity\export-fixture.mjs $ProviderId $flutterSurface | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Flutter fixture export failed with exit code $LASTEXITCODE" }

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
    $iosFixture = Join-Path $runRoot "ios-current-surface.json"
    node .\tools\parity\export-fixture.mjs $ProviderId $iosFixture | Out-Host
    powershell -ExecutionPolicy Bypass -File .\scripts\capture-eve-screenshot.ps1 `
      -Target $IosSshTarget `
      -OutputDirectory $runRoot `
      -FixturePath $iosFixture
  }

  $androidFlutterBuilt = $false
  foreach ($case in $responsiveCases) {
    Invoke-Capture "android-flutter-$($case.id)" {
      $args = @(
        "-ExecutionPolicy", "Bypass",
        "-File", "E:\Projects\EveFlutter\scripts\capture-android-flutter-parity.ps1",
        "-FixtureId", $ProviderId,
        "-SurfacePath", $flutterSurface,
        "-OutputPath", (Join-Path $runRoot "android-flutter-periwinkle-$($case.id).png"),
        "-Width", $case.width,
        "-Height", $case.height,
        "-Orientation", $case.orientation
      )
      if ($androidFlutterBuilt) {
        $args += "-SkipBuild"
      } else {
        $args += "-ForceInstall"
      }
      powershell @args
      $androidFlutterBuilt = $true
    }
  }

  foreach ($case in $androidDeviceCases) {
    Invoke-Capture "android-flutter-$($case.id)" {
      powershell -ExecutionPolicy Bypass -File E:\Projects\EveFlutter\scripts\capture-android-flutter-parity.ps1 `
        -FixtureId $ProviderId `
        -SurfacePath $flutterSurface `
        -OutputPath (Join-Path $runRoot "android-flutter-periwinkle-$($case.id).png") `
        -Orientation $case.orientation `
        -SkipBuild
    }
  }

  foreach ($case in $responsiveCases) {
    Invoke-Capture "windows-$($case.id)" {
      powershell -ExecutionPolicy Bypass -File E:\Projects\EveFlutter\scripts\capture-flutter-parity.ps1 `
        -Target windows `
        -FixtureId $ProviderId `
        -SurfacePath $flutterSurface `
        -ViewportId $case.id `
        -OutputPath (Join-Path $runRoot "windows-flutter-$ProviderId-$($case.id).png")
    }
  }

  foreach ($case in $responsiveCases) {
    Invoke-Capture "linux-$($case.id)" {
      powershell -ExecutionPolicy Bypass -File E:\Projects\EveFlutter\scripts\capture-linux-flutter-parity.ps1 `
        -SshTarget $LinuxSshTarget `
        -FixtureId $ProviderId `
        -SurfacePath $flutterSurface `
        -ViewportId $case.id `
        -OutputPath (Join-Path $runRoot "linux-flutter-$ProviderId-$($case.id).png")
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

  $contactSheetPython = Resolve-ContactSheetPython
  if ($contactSheetPython) {
    & $contactSheetPython .\tools\parity\render-contact-sheet.py $jsonPath | Out-Host
  } else {
    Write-Host "Parity contact sheet skipped: set EVE_PARITY_PYTHON to a Python with Pillow."
  }

  Write-Host "Parity smoke report: $mdPath"
  $failed = @($results.targets | Where-Object { $_.status -ne "pass" })
  if ($failed.Count -gt 0) {
    throw "$($failed.Count) parity smoke target(s) failed: $($failed.id -join ', ')"
  }
} finally {
  Pop-Location
}
