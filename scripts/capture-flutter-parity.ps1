param(
  [ValidateSet("windows", "linux")]
  [string] $Target = "windows",
  [ValidateSet("phone", "tablet", "desktop")]
  [string] $ViewportId = "desktop",
  [string] $FixtureId = "cultui-inspector",
  [string] $OutputPath = "artifacts\parity\flutter-windows-cultui-inspector.png"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$flutterRoot = Join-Path $projectRoot "flutter\eve_parity"
$flutter = Join-Path $projectRoot "tools\deps\flutter\bin\flutter.bat"
$assetPath = Join-Path $flutterRoot "assets\current-surface.json"
$fontDir = Join-Path $flutterRoot "assets\fonts"
$absoluteOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $projectRoot $OutputPath }
New-Item -ItemType Directory -Force (Split-Path -Parent $absoluteOutput) | Out-Null
New-Item -ItemType Directory -Force (Split-Path -Parent $assetPath) | Out-Null
New-Item -ItemType Directory -Force $fontDir | Out-Null

if (-not (Test-Path $flutter)) {
  throw "Flutter is not installed at $flutter"
}

if ($Target -eq "linux" -and $env:OS -like "Windows*") {
  throw "Linux Flutter screenshot requires a Linux runner; this host is Windows."
}

Copy-Item -LiteralPath (Join-Path $projectRoot "tools\deps\flutter\bin\cache\artifacts\material_fonts\roboto-regular.ttf") -Destination (Join-Path $fontDir "Roboto-Regular.ttf") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "tools\deps\flutter\bin\cache\artifacts\material_fonts\roboto-bold.ttf") -Destination (Join-Path $fontDir "Roboto-Bold.ttf") -Force

node .\tools\parity\export-fixture.mjs $FixtureId $assetPath | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Fixture export failed with exit code $LASTEXITCODE"
}

Push-Location $flutterRoot
try {
  & $flutter test --update-goldens "--dart-define=EVE_PARITY_FIXTURE=$FixtureId" --plain-name $ViewportId
  if ($LASTEXITCODE -ne 0) {
    throw "Flutter golden smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$golden = Join-Path $flutterRoot "test\goldens\$FixtureId-$ViewportId.png"
if (-not (Test-Path $golden) -or (Get-Item $golden).Length -le 0) {
  throw "Flutter golden did not produce a PNG: $golden"
}

Copy-Item -LiteralPath $golden -Destination $absoluteOutput -Force
Write-Host $absoluteOutput
