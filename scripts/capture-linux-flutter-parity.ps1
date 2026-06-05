param(
  [string] $SshTarget = "nightwing",
  [ValidateSet("phone", "tablet", "desktop")]
  [string] $ViewportId = "desktop",
  [string] $FixtureId = "cultui-inspector",
  [string] $OutputPath = "artifacts\parity\linux-flutter-cultui-inspector.png",
  [string] $RemoteRoot = "~/.local/share/gamecult/eve-parity-runner",
  [string] $RemoteFlutter = "~/.local/share/gamecult/flutter/bin/flutter"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot "flutter\eve_parity"
$assetPath = Join-Path $sourceRoot "assets\current-surface.json"
$fontDir = Join-Path $sourceRoot "assets\fonts"
$repixelizerAssetDir = Join-Path $sourceRoot "assets\repixelizer"
$absoluteOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $projectRoot $OutputPath }
$archivePath = Join-Path ([System.IO.Path]::GetTempPath()) "eve-parity-linux-$([guid]::NewGuid()).tar"
New-Item -ItemType Directory -Force (Split-Path -Parent $absoluteOutput) | Out-Null
New-Item -ItemType Directory -Force (Split-Path -Parent $assetPath) | Out-Null
New-Item -ItemType Directory -Force $fontDir | Out-Null
New-Item -ItemType Directory -Force $repixelizerAssetDir | Out-Null

if (-not (Test-Path $sourceRoot)) {
  throw "Flutter parity source not found: $sourceRoot"
}

node .\tools\parity\export-fixture.mjs $FixtureId $assetPath | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Fixture export failed with exit code $LASTEXITCODE"
}
Copy-Item -LiteralPath (Join-Path $projectRoot "tools\deps\flutter\bin\cache\artifacts\material_fonts\roboto-regular.ttf") -Destination (Join-Path $fontDir "Roboto-Regular.ttf") -Force
Copy-Item -LiteralPath (Join-Path $projectRoot "tools\deps\flutter\bin\cache\artifacts\material_fonts\roboto-bold.ttf") -Destination (Join-Path $fontDir "Roboto-Bold.ttf") -Force
curl.exe -L "https://repixelizer.gamecult.org/app/landing-assets/character-input.png" -o (Join-Path $repixelizerAssetDir "character-input.png") | Out-Host
curl.exe -L "https://repixelizer.gamecult.org/app/landing-assets/character-repixelized.png" -o (Join-Path $repixelizerAssetDir "character-repixelized.png") | Out-Host

try {
  Push-Location $sourceRoot
  try {
    tar --exclude .dart_tool --exclude build -cf $archivePath .
    if ($LASTEXITCODE -ne 0) {
      throw "tar failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }

  ssh $SshTarget "rm -rf $RemoteRoot && mkdir -p $RemoteRoot"
  scp $archivePath "${SshTarget}:/tmp/eve-parity-linux.tar" | Out-Host
  ssh $SshTarget "tar -xf /tmp/eve-parity-linux.tar -C $RemoteRoot && rm /tmp/eve-parity-linux.tar"
  ssh $SshTarget "cd $RemoteRoot && $RemoteFlutter test --update-goldens --dart-define=EVE_PARITY_FIXTURE=$FixtureId --plain-name $ViewportId" | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Nightwing Flutter golden smoke failed with exit code $LASTEXITCODE"
  }

  $remoteGolden = "$RemoteRoot/test/goldens/$FixtureId-$ViewportId.png"
  scp "${SshTarget}:$remoteGolden" $absoluteOutput | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "scp from Nightwing failed with exit code $LASTEXITCODE"
  }
} finally {
  if (Test-Path $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
  }
}

if (-not (Test-Path $absoluteOutput) -or (Get-Item $absoluteOutput).Length -le 0) {
  throw "Nightwing Flutter capture did not produce a PNG: $absoluteOutput"
}

Write-Host $absoluteOutput
