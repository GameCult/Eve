param(
  [string] $ProviderId = "eve.cultui.inspector",
  [string] $OutputPath = "artifacts\parity\web-cultui-inspector.png",
  [int] $Port = 8798,
  [int] $Width = 1280,
  [int] $Height = 720
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$absoluteOutput = if ([System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath } else { Join-Path $projectRoot $OutputPath }
New-Item -ItemType Directory -Force (Split-Path -Parent $absoluteOutput) | Out-Null

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
  throw "Chrome is required for web parity capture and was not found."
}

try {
  $status = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 2).StatusCode
} catch {
  powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "start-browser-reference.ps1") -Port $Port | Out-Host
}

$url = "http://127.0.0.1:$Port/?provider=$ProviderId"
$arguments = @(
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=$Width,$Height",
  "--virtual-time-budget=2500",
  "--screenshot=$absoluteOutput",
  $url
)

& $chrome @arguments | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Chrome screenshot capture failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $absoluteOutput) -or (Get-Item $absoluteOutput).Length -le 0) {
  throw "Chrome screenshot capture did not produce a PNG: $absoluteOutput"
}

Write-Host $absoluteOutput
