param(
  [string] $AetheriaRoot = "E:\Projects\Aetheria",
  [string] $UnityExe = "C:\Program Files\Unity\Hub\Editor\6000.4.2f1\Editor\Unity.exe",
  [string] $OutputRoot = "",
  [string] $PackageName = "org.gamecult.eve.unity-uitoolkit",
  [string] $TestAssembly = "GameCult.Eve.UnityUIToolkit.Tests",
  [string] $TestFilter = ""
)

$ErrorActionPreference = "Stop"

$eveRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $eveRoot "artifacts\aetheria-unity-editmode"
}
if ([string]::IsNullOrWhiteSpace($PackageName)) {
  throw "Unity EditMode package name must not be empty"
}
if ([string]::IsNullOrWhiteSpace($TestAssembly)) {
  throw "Unity EditMode test assembly must not be empty"
}

if (-not (Test-Path -LiteralPath $AetheriaRoot)) {
  throw "Aetheria repo not found: $AetheriaRoot"
}
if (-not (Test-Path -LiteralPath $UnityExe)) {
  throw "Unity editor not found: $UnityExe"
}

$manifestPath = Join-Path $AetheriaRoot "Packages\manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Aetheria Unity package manifest not found: $manifestPath"
}

$stamp = Get-Date -Format "yyyyMMddTHHmmss"
$runRoot = Join-Path $OutputRoot $stamp
New-Item -ItemType Directory -Force -Path $runRoot | Out-Null

$resultsPath = Join-Path $runRoot "unity-editmode-results.xml"
$logPath = Join-Path $runRoot "unity-editmode.log"

$originalManifest = Get-Content -Raw -LiteralPath $manifestPath
$manifestRestored = $false

function Restore-Manifest {
  if (-not $script:manifestRestored) {
    Set-Content -LiteralPath $manifestPath -Value $script:originalManifest -NoNewline
    $script:manifestRestored = $true
  }
}

try {
  $manifest = $originalManifest | ConvertFrom-Json
  $testables = @()
  if ($null -ne $manifest.testables) {
    $testables = @($manifest.testables) | Where-Object { $null -ne $_ -and -not [string]::IsNullOrWhiteSpace([string] $_) }
  }
  if ($testables -notcontains $PackageName) {
    $testables += $PackageName
    if ($manifest.PSObject.Properties.Name -contains "testables") {
      $manifest.testables = $testables
    } else {
      $manifest | Add-Member -NotePropertyName "testables" -NotePropertyValue $testables
    }
    $manifest | ConvertTo-Json -Depth 32 | Set-Content -LiteralPath $manifestPath
  }

  $arguments = @(
    "-batchmode",
    "-projectPath", $AetheriaRoot,
    "-runTests",
    "-testPlatform", "EditMode",
    "-assemblyNames", $TestAssembly,
    "-testResults", $resultsPath,
    "-logFile", $logPath
  )
  if (-not [string]::IsNullOrWhiteSpace($TestFilter)) {
    $arguments += @("-testFilter", $TestFilter)
  }

  $process = Start-Process -FilePath $UnityExe -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
  $exitCode = $process.ExitCode
} finally {
  Restore-Manifest
}

if ($exitCode -ne 0) {
  if (Test-Path -LiteralPath $logPath) {
    Get-Content -LiteralPath $logPath -Tail 120
  }
  throw "Unity EditMode test run failed with exit code $exitCode. Log: $logPath"
}

if (-not (Test-Path -LiteralPath $resultsPath)) {
  throw "Unity EditMode test run did not produce results: $resultsPath"
}

[xml] $results = Get-Content -Raw -LiteralPath $resultsPath
$testRun = $results.SelectSingleNode("//test-run")
if ($null -eq $testRun) {
  throw "Unity EditMode test results did not contain a test-run node: $resultsPath"
}

$failed = [int] $testRun.failed
$passed = [int] $testRun.passed
$total = [int] $testRun.total
if ($failed -gt 0) {
  throw "Unity EditMode tests failed: $failed failed, $passed passed, $total total. Results: $resultsPath"
}

Write-Host "Unity EditMode tests passed for ${TestAssembly}: $passed passed, $total total"
Write-Host "Unity EditMode results: $resultsPath"
Write-Host "Unity EditMode log: $logPath"
