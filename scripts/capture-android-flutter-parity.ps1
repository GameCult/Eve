param(
  [string] $FixtureId = "cultui-inspector",
  [string] $OutputPath = "artifacts\parity\android-flutter-cultui-inspector.png",
  [int] $Width = 0,
  [int] $Height = 0,
  [ValidateSet("portrait", "landscape", "natural")]
  [string] $Orientation = "natural",
  [int] $LaunchDelaySeconds = 4,
  [switch] $SkipBuild,
  [switch] $ForceInstall
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$flutterRoot = Join-Path $projectRoot "flutter\eve_parity"
$flutter = Join-Path $projectRoot "tools\deps\flutter\bin\flutter.bat"
$assetPath = Join-Path $flutterRoot "assets\current-surface.json"
$fontDir = Join-Path $flutterRoot "assets\fonts"
$repixelizerAssetDir = Join-Path $flutterRoot "assets\repixelizer"
$apkPath = Join-Path $flutterRoot "build\app\outputs\flutter-apk\app-debug.apk"

if (-not (Test-Path $flutter)) {
  throw "Flutter is not installed at $flutter"
}

if (-not $SkipBuild) {
  New-Item -ItemType Directory -Force (Split-Path -Parent $assetPath) | Out-Null
  New-Item -ItemType Directory -Force $fontDir | Out-Null
  New-Item -ItemType Directory -Force $repixelizerAssetDir | Out-Null

  Copy-Item -LiteralPath (Join-Path $projectRoot "tools\deps\flutter\bin\cache\artifacts\material_fonts\roboto-regular.ttf") -Destination (Join-Path $fontDir "Roboto-Regular.ttf") -Force
  Copy-Item -LiteralPath (Join-Path $projectRoot "tools\deps\flutter\bin\cache\artifacts\material_fonts\roboto-bold.ttf") -Destination (Join-Path $fontDir "Roboto-Bold.ttf") -Force
  curl.exe -L "https://repixelizer.gamecult.org/app/landing-assets/character-input.png" -o (Join-Path $repixelizerAssetDir "character-input.png") | Out-Host
  curl.exe -L "https://repixelizer.gamecult.org/app/landing-assets/character-repixelized.png" -o (Join-Path $repixelizerAssetDir "character-repixelized.png") | Out-Host

  node .\tools\parity\export-fixture.mjs $FixtureId $assetPath | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Fixture export failed with exit code $LASTEXITCODE"
  }

  Push-Location $flutterRoot
  try {
    & $flutter pub get
    if ($LASTEXITCODE -ne 0) {
      throw "Flutter pub get failed with exit code $LASTEXITCODE"
    }
    & $flutter build apk --debug "--dart-define=EVE_PARITY_FIXTURE=$FixtureId"
    if ($LASTEXITCODE -ne 0) {
      throw "Flutter Android APK build failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

if (-not (Test-Path $apkPath)) {
  throw "Flutter Android APK not found: $apkPath"
}

$captureArgs = @(
  "-ExecutionPolicy", "Bypass",
  "-File", ".\scripts\capture-android-screenshot.ps1",
  "-OutputPath", $OutputPath,
  "-ApkPath", $apkPath,
  "-PackageName", "com.example.eve_parity",
  "-ActivityName", ".MainActivity",
  "-LaunchDelaySeconds", $LaunchDelaySeconds,
  "-Orientation", $Orientation
)

if ($Width -gt 0) {
  $captureArgs += @("-Width", $Width)
}
if ($Height -gt 0) {
  $captureArgs += @("-Height", $Height)
}
if ($ForceInstall -or -not $SkipBuild) {
  $captureArgs += "-ForceInstall"
}

powershell @captureArgs
if ($LASTEXITCODE -ne 0) {
  throw "Android Flutter screenshot failed with exit code $LASTEXITCODE"
}
