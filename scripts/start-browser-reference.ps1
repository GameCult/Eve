param(
  [int] $Port = 8798,
  [string] $OdinRoot = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "Odin"),
  [string] $OdinCultMeshUri = $(if ($env:ODIN_CULTMESH_URI) { $env:ODIN_CULTMESH_URI } else { "cultmesh://odin/rendezvous/provider-catalog" })
)

$ErrorActionPreference = "Stop"
$launcher = Join-Path $OdinRoot "scripts\start-hermodr.ps1"
if (-not (Test-Path -LiteralPath $launcher)) {
  throw "Odin-owned Hermodr launcher is missing: $launcher"
}

$healthUrl = "http://127.0.0.1:$Port/health"
try {
  $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
  if ($health.ok -and $health.service -eq "hermodr-browser-lowering") {
    Write-Host "Eve browser reference already available at http://127.0.0.1:$Port/"
    exit 0
  }
} catch {
  # Hermodr is not running on the requested local port.
}

& $launcher -HostAddress "127.0.0.1" -Port $Port -OdinCultMeshUri $OdinCultMeshUri -NoWindow
if (-not $?) {
  throw "Hermodr failed to start."
}
Write-Host "Eve browser reference available at http://127.0.0.1:$Port/"
