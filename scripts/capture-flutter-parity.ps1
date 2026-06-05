param(
  [ValidateSet("windows", "linux")]
  [string] $Target = "windows",
  [string] $OutputPath = "artifacts\parity\flutter-windows-cultui-inspector.png"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$flutterRoot = Join-Path $projectRoot "flutter\eve_parity"
$flutter = Join-Path $projectRoot "tools\deps\flutter\bin\flutter.bat"
$absoluteOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $projectRoot $OutputPath }
New-Item -ItemType Directory -Force (Split-Path -Parent $absoluteOutput) | Out-Null

if (-not (Test-Path $flutter)) {
  throw "Flutter is not installed at $flutter"
}

if ($Target -eq "linux" -and $env:OS -like "Windows*") {
  throw "Linux Flutter screenshot requires a Linux runner; this host is Windows."
}

Push-Location $flutterRoot
try {
  & $flutter test --update-goldens
  if ($LASTEXITCODE -ne 0) {
    throw "Flutter golden smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$golden = Join-Path $flutterRoot "test\goldens\cultui-inspector.png"
if (-not (Test-Path $golden) -or (Get-Item $golden).Length -le 0) {
  throw "Flutter golden did not produce a PNG: $golden"
}

Copy-Item -LiteralPath $golden -Destination $absoluteOutput -Force
Write-Host $absoluteOutput
