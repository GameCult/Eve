param(
  [string] $SshTarget = "nightwing"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$localScript = Join-Path $projectRoot "scripts\install-nightwing-flutter-sdk.sh"
$remoteScript = "~/.local/bin/install-eve-flutter-sdk.sh"
$stateDir = "~/.local/state/gamecult"
$pidPath = "$stateDir/eve-linux-flutter-install.pid"
$logPath = "$stateDir/eve-linux-flutter-install.log"

ssh $SshTarget "mkdir -p ~/.local/bin ~/.local/state/gamecult"
scp $localScript "${SshTarget}:$remoteScript" | Out-Host
ssh $SshTarget "chmod +x $remoteScript"
ssh $SshTarget "nohup $remoteScript >/dev/null 2>&1 & echo `$! > $pidPath && echo $pidPath && echo $logPath"
