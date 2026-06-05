param(
  [string] $Target = "eve",
  [string] $OutputDirectory = "artifacts\screenshots",
  [string] $BundleId = "org.gamecult.evecanvas"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = if ([System.IO.Path]::IsPathRooted($OutputDirectory)) {
  $OutputDirectory
} else {
  Join-Path $projectRoot $OutputDirectory
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$localPath = Join-Path $outputRoot "eve-$stamp.png"
$remoteDir = "/var/mobile/Library/EveCanvas"
$remotePath = "$remoteDir/latest-screenshot.png"
$requestPath = "$remoteDir/capture-request"

ssh $Target "uiopen --bundleid '$BundleId' >/dev/null 2>&1 || true"
Start-Sleep -Seconds 1
ssh $Target "mkdir -p '$remoteDir' && chown mobile:mobile '$remoteDir' && rm -f '$remotePath' '$requestPath' && touch '$requestPath' && chown mobile:mobile '$requestPath' 2>/dev/null || true"

$deadline = (Get-Date).AddSeconds(10)
do {
  Start-Sleep -Milliseconds 250
  ssh $Target "test -s '$remotePath'"
  if ($LASTEXITCODE -eq 0) {
    scp "${Target}:$remotePath" $localPath
    Write-Host $localPath
    exit 0
  }
} while ((Get-Date) -lt $deadline)

throw "Timed out waiting for EveCanvas screenshot at ${Target}:$remotePath"
