param(
  [string] $OutputPath = "artifacts\parity\android-periwinkle.png",
  [string] $ApkPath = "artifacts\android\eve-debug.apk",
  [string] $PackageName = "org.gamecult.eve",
  [string] $ActivityName = ".MainActivity",
  [int] $LaunchDelaySeconds = 3,
  [int] $Width = 0,
  [int] $Height = 0,
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
try {
  if ($overrideSize) {
    adb shell am force-stop $PackageName | Out-Host
    adb shell wm size "${Width}x${Height}" | Out-Host
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

  adb shell am start -n "$PackageName/$ActivityName" | Out-Host
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
}

if (-not (Test-Path $absoluteOutput) -or (Get-Item $absoluteOutput).Length -le 0) {
  throw "adb screencap did not produce a PNG: $absoluteOutput"
}

Write-Host $absoluteOutput
