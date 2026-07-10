param([string] $EvePluginsRoot = "E:\Projects\EvePlugins")

$ErrorActionPreference = "Stop"

$requiredPaths = @(
  "plugins\eve-plugin-tex\plugin.json",
  "plugins\eve-plugin-tex\advertisement.json",
  "plugins\eve-plugin-tex\plugin-abi-fixture.json",
  "plugins\eve-plugin-tex\src\sidecar.mjs",
  "scripts\run-tex-witness.mjs"
)

foreach ($relativePath in $requiredPaths) {
  $path = Join-Path $EvePluginsRoot $relativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "EvePlugins owner path is missing: $path"
  }
}

Push-Location $EvePluginsRoot
try {
  npm test
  if ($LASTEXITCODE -ne 0) { throw "EvePlugins tests failed." }
  npm run witness:tex
  if ($LASTEXITCODE -ne 0) { throw "EvePlugins TeX witness failed." }
} finally {
  Pop-Location
}

Write-Host "EvePlugins TeX owner smoke passed: $EvePluginsRoot"
