param(
  [string] $AetheriaRoot = "E:\Projects\Aetheria",
  [string] $UnityExe = "C:\Program Files\Unity\Hub\Editor\6000.4.2f1\Editor\Unity.exe",
  [string] $OutputRoot = ""
)

$ErrorActionPreference = "Stop"

$eveRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
  $OutputRoot = Join-Path $eveRoot "artifacts\aetheria-unity-scene-editmode"
}

& (Join-Path $PSScriptRoot "run-aetheria-unity-editmode-tests.ps1") `
  -AetheriaRoot $AetheriaRoot `
  -UnityExe $UnityExe `
  -OutputRoot $OutputRoot `
  -PackageName "org.gamecult.eve.unity-scene" `
  -TestAssembly "GameCult.Eve.UnityScene.Tests"
