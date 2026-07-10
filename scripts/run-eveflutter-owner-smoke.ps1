param(
  [string] $EveFlutterRoot = "E:\Projects\EveFlutter",
  [string] $FlutterRoot = "E:\Projects\Eve\tools\deps\flutter"
)

$ErrorActionPreference = "Stop"
$dart = Join-Path $FlutterRoot "bin\cache\dart-sdk\bin\dart.exe"
$flutter = Join-Path $FlutterRoot "bin\flutter.bat"
$surfacePath = Join-Path $EveFlutterRoot "assets\current-surface.json"
$fontDirectory = Join-Path $EveFlutterRoot "assets\fonts"

foreach ($path in @(
  (Join-Path $EveFlutterRoot "lib\main.dart"),
  (Join-Path $EveFlutterRoot "test\parity_smoke_test.dart"),
  (Join-Path $EveFlutterRoot "eveflutter-lifecycle.json"),
  $dart,
  $flutter
)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "EveFlutter owner dependency is missing: $path" }
}

$runtimeSources = Get-Content (Join-Path $EveFlutterRoot "lib\main.dart") -Raw
if ($runtimeSources -match "aetheria|repixelizer|gamecult\.home") {
  throw "EveFlutter runtime source contains provider-specific authority."
}

New-Item -ItemType Directory -Force -Path $fontDirectory | Out-Null
$conformanceRoot = if ($env:EVE_CONFORMANCE_ROOT) { $env:EVE_CONFORMANCE_ROOT } else { "E:\Projects\EveConformance" }
$env:EVE_KERNEL_ROOT = Split-Path -Parent $PSScriptRoot
node (Join-Path $conformanceRoot "tools\parity\export-fixture.mjs") cultui-inspector $surfacePath
if ($LASTEXITCODE -ne 0) { throw "Eve fixture export for EveFlutter failed." }
Copy-Item -LiteralPath (Join-Path $FlutterRoot "bin\cache\artifacts\material_fonts\roboto-regular.ttf") -Destination (Join-Path $fontDirectory "Roboto-Regular.ttf") -Force
Copy-Item -LiteralPath (Join-Path $FlutterRoot "bin\cache\artifacts\material_fonts\roboto-bold.ttf") -Destination (Join-Path $fontDirectory "Roboto-Bold.ttf") -Force

Push-Location $EveFlutterRoot
try {
  & $dart analyze lib test
  if ($LASTEXITCODE -ne 0) { throw "EveFlutter analyzer failed." }

  $path = "C:\WINDOWS\system32;C:\WINDOWS;C:\WINDOWS\System32\WindowsPowerShell\v1.0;C:\Program Files\Git\cmd;C:\Program Files\nodejs"
  cmd /d /s /c "set PATH=$path&& $flutter test test\parity_smoke_test.dart"
  if ($LASTEXITCODE -ne 0) { throw "EveFlutter tests failed." }
} finally {
  Pop-Location
}

Write-Host "EveFlutter owner smoke passed: $EveFlutterRoot"
