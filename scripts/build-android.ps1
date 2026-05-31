param(
  [string] $AndroidSdk = "$env:LOCALAPPDATA\Android\Sdk",
  [string] $JavaHome = "C:\Program Files\Android\Android Studio\jbr",
  [string] $Configuration = "debug"
)

$ErrorActionPreference = "Stop"
$env:JAVA_HOME = $JavaHome
$env:PATH = "$(Join-Path $JavaHome 'bin');$env:PATH"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $projectRoot "android\app"
$outRoot = Join-Path $projectRoot "artifacts\android"
$packageName = "org.gamecult.eve"
$buildTools = Get-ChildItem (Join-Path $AndroidSdk "build-tools") -Directory | Sort-Object Name -Descending | Select-Object -First 1
$platform = Get-ChildItem (Join-Path $AndroidSdk "platforms") -Directory | Sort-Object Name -Descending | Select-Object -First 1

if (-not $buildTools -or -not $platform) {
  throw "Android SDK build-tools/platforms not found under $AndroidSdk"
}

$aapt2 = Join-Path $buildTools.FullName "aapt2.exe"
$d8 = Join-Path $buildTools.FullName "d8.bat"
$zipalign = Join-Path $buildTools.FullName "zipalign.exe"
$apksigner = Join-Path $buildTools.FullName "apksigner.bat"
$javac = Join-Path $JavaHome "bin\javac.exe"
$keytool = Join-Path $JavaHome "bin\keytool.exe"
$jar = Join-Path $JavaHome "bin\jar.exe"
$androidJar = Join-Path $platform.FullName "android.jar"

foreach ($tool in @($aapt2, $d8, $zipalign, $apksigner, $javac, $keytool, $jar, $androidJar)) {
  if (-not (Test-Path $tool)) {
    throw "Required Android build input missing: $tool"
  }
}

function Invoke-Checked {
  param(
    [string] $FilePath,
    [string[]] $Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE"
  }
}

New-Item -ItemType Directory -Force $outRoot | Out-Null
$compiled = Join-Path $outRoot "compiled.zip"
$gen = Join-Path $outRoot "gen"
$classes = Join-Path $outRoot "classes"
$classesJar = Join-Path $outRoot "classes.jar"
$dex = Join-Path $outRoot "dex"
$unsigned = Join-Path $outRoot "eve-unsigned.apk"
$aligned = Join-Path $outRoot "eve-aligned.apk"
$signed = Join-Path $outRoot "eve-$Configuration.apk"
$keystore = Join-Path $outRoot "eve-debug.keystore"

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $compiled, $gen, $classes, $classesJar, $dex, $unsigned, $aligned, $signed
New-Item -ItemType Directory -Force $gen, $classes, $dex | Out-Null

Invoke-Checked $aapt2 @("compile", "--dir", (Join-Path $androidRoot "src\main\res"), "-o", $compiled)
Invoke-Checked $aapt2 @(
  "link",
  "-o", $unsigned,
  "-I", $androidJar,
  "--manifest", (Join-Path $androidRoot "src\main\AndroidManifest.xml"),
  "--java", $gen,
  "--min-sdk-version", "26",
  "--target-sdk-version", "35",
  $compiled)

$sources = @()
$sources += Get-ChildItem (Join-Path $androidRoot "src\main\java") -Recurse -Filter *.java | Select-Object -ExpandProperty FullName
$sources += Get-ChildItem $gen -Recurse -Filter *.java | Select-Object -ExpandProperty FullName
Invoke-Checked $javac (@("-source", "8", "-target", "8", "-bootclasspath", $androidJar, "-d", $classes) + $sources)
Invoke-Checked $jar @("cf", $classesJar, "-C", $classes, ".")
Invoke-Checked $d8 @("--lib", $androidJar, "--output", $dex, $classesJar)
Invoke-Checked $jar @("uf", $unsigned, "-C", $dex, "classes.dex")
Invoke-Checked $zipalign @("-f", "4", $unsigned, $aligned)

if (-not (Test-Path $keystore)) {
  Invoke-Checked $keytool @(
    "-genkeypair", "-v",
    "-keystore", $keystore,
    "-storepass", "android",
    "-keypass", "android",
    "-alias", "eve-debug",
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-dname", "CN=Eve Debug,O=GameCult,C=US")
}

Invoke-Checked $apksigner @(
  "sign",
  "--ks", $keystore,
  "--ks-pass", "pass:android",
  "--key-pass", "pass:android",
  "--out", $signed,
  $aligned)

Invoke-Checked $apksigner @("verify", $signed)
Write-Host "Built $signed"
