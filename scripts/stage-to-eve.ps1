param(
  [string] $Target = "eve",
  [string] $RemotePath = "/var/mobile/Projects/Eve"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$archive = Join-Path $env:TEMP "eve-canvas-source.tar"

if (Test-Path $archive) {
  Remove-Item -LiteralPath $archive -Force
}

tar -cf $archive -C $projectRoot .
ssh $Target "mkdir -p '$RemotePath'"
scp $archive "${Target}:/tmp/eve-canvas-source.tar"
ssh $Target "tar -xf /tmp/eve-canvas-source.tar -C '$RemotePath' && rm /tmp/eve-canvas-source.tar && find '$RemotePath' -maxdepth 2 -type f | sort"

Write-Host "Staged EveCanvas to ${Target}:$RemotePath"
