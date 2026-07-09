param(
  [string] $LifecyclePath = "flutter\eve_parity\eveflutter-lifecycle.json",
  [switch] $SkipAnalyze
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteLifecyclePath = if ([System.IO.Path]::IsPathRooted($LifecyclePath)) {
  $LifecyclePath
} else {
  Join-Path $projectRoot $LifecyclePath
}

if (-not (Test-Path $absoluteLifecyclePath)) {
  throw "EveFlutter lifecycle document not found: $absoluteLifecyclePath"
}

$lifecycle = Get-Content -LiteralPath $absoluteLifecyclePath -Raw | ConvertFrom-Json

if ($lifecycle.schema -ne "gamecult.eve.runtime_lifecycle.v1") {
  throw "Unexpected lifecycle schema: $($lifecycle.schema)"
}
if ($lifecycle.splitTarget -ne "EveFlutter") {
  throw "Unexpected split target: $($lifecycle.splitTarget)"
}
if ($lifecycle.ownerRepo -ne "EveFlutter") {
  throw "Unexpected owner repo: $($lifecycle.ownerRepo)"
}
if ($lifecycle.currentHostRepo -ne "Eve") {
  throw "Unexpected current host repo: $($lifecycle.currentHostRepo)"
}

$expectedRuntimes = @("windows-flutter", "linux-flutter", "android-flutter")
foreach ($runtimeId in $expectedRuntimes) {
  if (-not ($lifecycle.runtimes -contains $runtimeId)) {
    throw "EveFlutter lifecycle missing runtime: $runtimeId"
  }
}

foreach ($stage in @("release", "test", "capture")) {
  $stageDocument = $lifecycle.$stage
  if ($null -eq $stageDocument) {
    throw "EveFlutter lifecycle missing stage: $stage"
  }
  if ($stageDocument.ownerRepo -ne "EveFlutter") {
    throw "EveFlutter lifecycle stage $stage has unexpected owner: $($stageDocument.ownerRepo)"
  }
  if (-not $stageDocument.status) {
    throw "EveFlutter lifecycle stage $stage missing status"
  }
  foreach ($evidencePath in $stageDocument.evidencePaths) {
    $absoluteEvidencePath = Join-Path $projectRoot $evidencePath
    if (-not (Test-Path $absoluteEvidencePath)) {
      throw "EveFlutter lifecycle stage $stage missing evidence path: $evidencePath"
    }
  }
}

if (-not $SkipAnalyze) {
  $dart = Join-Path $projectRoot "tools\deps\flutter\bin\cache\dart-sdk\bin\dart.exe"
  if (-not (Test-Path $dart)) {
    throw "Dart SDK not found: $dart"
  }

  Push-Location (Join-Path $projectRoot "flutter\eve_parity")
  try {
    & $dart analyze lib test
    if ($LASTEXITCODE -ne 0) {
      throw "EveFlutter Dart analyzer failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

& (Join-Path $projectRoot "scripts\run-eveflutter-conformance-consumer-smoke.ps1")
if ($LASTEXITCODE -ne 0) {
  throw "EveFlutter conformance consumer smoke failed with exit code $LASTEXITCODE"
}

Write-Host "EveFlutter lifecycle smoke passed: $absoluteLifecyclePath"
