param(
  [string] $OutputPath = "artifacts\parity\android-periwinkle.png",
  [string] $ApkPath = "artifacts\android\eve-debug.apk",
  [string] $PackageName = "org.gamecult.eve",
  [string] $ActivityName = ".MainActivity",
  [int] $LaunchDelaySeconds = 3,
  [int] $Width = 0,
  [int] $Height = 0,
  [ValidateSet("portrait", "landscape", "natural")]
  [string] $Orientation = "natural",
  [switch] $UseFixture,
  [switch] $ForceInstall
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $projectRoot $OutputPath }
$absoluteApk = if ([System.IO.Path]::IsPathRooted($ApkPath)) { $ApkPath } else { Join-Path $projectRoot $ApkPath }
New-Item -ItemType Directory -Force (Split-Path -Parent $absoluteOutput) | Out-Null

$devices = adb devices | Select-String -Pattern "device$"
if (-not $devices) {
  throw "No adb device is connected for Android parity capture."
}

if (-not (Test-Path $absoluteApk)) {
  throw "Android APK not found: $absoluteApk"
}

$overrideSize = $Width -gt 0 -and $Height -gt 0
$overrideRotation = $Orientation -ne "natural"
$previousWindowUserRotation = $null
$previousIgnoreOrientationRequest = $null
try {
  if ($overrideRotation) {
    $previousWindowUserRotation = (adb shell cmd window user-rotation).Trim()
    $previousIgnoreOrientationRequest = (adb shell cmd window get-ignore-orientation-request).Trim()
    $rotation = if ($Orientation -eq "landscape") { "1" } else { "0" }
    adb shell cmd window set-ignore-orientation-request true | Out-Host
    adb shell cmd window user-rotation lock $rotation | Out-Host
  }

  if ($overrideSize -or $overrideRotation) {
    adb shell am force-stop $PackageName | Out-Host
  }

  if ($overrideSize) {
    $wmWidth = if ($Orientation -eq "landscape") { $Height } else { $Width }
    $wmHeight = if ($Orientation -eq "landscape") { $Width } else { $Height }
    adb shell wm size "${wmWidth}x${wmHeight}" | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "adb wm size failed with exit code $LASTEXITCODE"
    }
  }

  $installed = adb shell pm path $PackageName
  if ($ForceInstall -or -not $installed) {
    adb install -r $absoluteApk | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw "adb install failed with exit code $LASTEXITCODE"
    }
  }

  $launchArgs = @("shell", "am", "start", "-n", "$PackageName/$ActivityName")
  if ($UseFixture) {
    $launchArgs += @("--ez", "org.gamecult.eve.PARITY_FIXTURE", "true")
  }
  adb @launchArgs | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "adb launch failed with exit code $LASTEXITCODE"
  }

  Start-Sleep -Seconds $LaunchDelaySeconds

  cmd /c "adb exec-out screencap -p > `"$absoluteOutput`""
  if ($LASTEXITCODE -ne 0) {
    throw "adb screencap failed with exit code $LASTEXITCODE"
  }
} finally {
  if ($overrideSize) {
    adb shell wm size reset | Out-Host
  }
  if ($overrideRotation) {
    if ($previousWindowUserRotation -match "^free") {
      adb shell cmd window user-rotation free | Out-Host
    } elseif ($previousWindowUserRotation -match "^lock\s+(\d+)") {
      adb shell cmd window user-rotation lock $Matches[1] | Out-Host
    }
    if ($previousIgnoreOrientationRequest -match "true") {
      adb shell cmd window set-ignore-orientation-request true | Out-Host
    } elseif ($previousIgnoreOrientationRequest -match "false") {
      adb shell cmd window set-ignore-orientation-request false | Out-Host
    }
  }
}

if (-not (Test-Path $absoluteOutput) -or (Get-Item $absoluteOutput).Length -le 0) {
  throw "adb screencap did not produce a PNG: $absoluteOutput"
}

Write-Host $absoluteOutput
