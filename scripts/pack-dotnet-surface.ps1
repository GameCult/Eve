param(
  [string] $CultLibRoot = "",
  [string] $Configuration = "Release",
  [string] $OutputDirectory = "artifacts\nuget",
  [switch] $SkipConsumerSmoke
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($CultLibRoot)) {
  $CultLibRoot = Join-Path (Split-Path -Parent $repoRoot) "CultLib"
}
$cultLibPath = [IO.Path]::GetFullPath($CultLibRoot)
$cultLibPack = Join-Path $cultLibPath "scripts\pack-nuget.ps1"
if (-not (Test-Path -LiteralPath $cultLibPack)) {
  throw "CultLib NuGet packer was not found at '$cultLibPack'."
}
$outputRoot = if ([IO.Path]::IsPathRooted($OutputDirectory)) {
  [IO.Path]::GetFullPath($OutputDirectory)
} else {
  [IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDirectory))
}

& $cultLibPack -Configuration $Configuration -OutputDirectory $outputRoot -SkipConsumerSmoke
if ($LASTEXITCODE -ne 0) {
  throw "CultLib NuGet dependency pack failed with exit code $LASTEXITCODE."
}

$surfaceProject = Join-Path $repoRoot "packages\org.gamecult.eve.surface\GameCult.Eve.Surface.csproj"
dotnet pack $surfaceProject -c $Configuration -o $outputRoot `
  -p:CultLibRoot=$cultLibPath -p:NoWarn=1591%3BCS8632 `
  --nologo --verbosity quiet
if ($LASTEXITCODE -ne 0) {
  throw "Eve surface NuGet pack failed with exit code $LASTEXITCODE."
}

$surfacePackage = Get-ChildItem -LiteralPath $outputRoot -Filter "GameCult.Eve.Surface.*.nupkg" |
  Where-Object { $_.Name -notlike "*.snupkg" } |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1
if (-not $surfacePackage) {
  throw "GameCult.Eve.Surface package was not produced."
}
$version = [regex]::Match(
  $surfacePackage.Name,
  '^GameCult\.Eve\.Surface\.(.+)\.nupkg$').Groups[1].Value

if (-not $SkipConsumerSmoke) {
  $smokeRoot = Join-Path ([IO.Path]::GetTempPath()) ("eve-surface-consumer-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $smokeRoot | Out-Null
  try {
    $projectDocument = @"
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <OutputType>Exe</OutputType>
    <ImplicitUsings>enable</ImplicitUsings>
    <RestoreSources>$outputRoot;https://api.nuget.org/v3/index.json</RestoreSources>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="GameCult.Eve.Surface" Version="$version" />
  </ItemGroup>
</Project>
"@
    $program = @"
using GameCult.Eve.Surface;

var surface = EveSurface.Create("sample.counter")
    .Provider("sample.counter-provider", "sample.daemon")
    .Title("Clean package consumer")
    .RootColumn("root", root => root.Title("title", "Portable Eve"))
    .Build();
if (surface.Schema != EveSurfaceDocument.SchemaId)
    throw new InvalidOperationException("The packed surface contract returned the wrong schema.");
Console.WriteLine(surface.Schema);
"@
    [IO.File]::WriteAllText(
      (Join-Path $smokeRoot "Consumer.csproj"),
      $projectDocument,
      [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText(
      (Join-Path $smokeRoot "Program.cs"),
      $program,
      [Text.UTF8Encoding]::new($false))
    dotnet run --project (Join-Path $smokeRoot "Consumer.csproj") -c $Configuration `
      --nologo --verbosity quiet
    if ($LASTEXITCODE -ne 0) {
      throw "Eve surface clean NuGet consumer failed with exit code $LASTEXITCODE."
    }
  } finally {
    if (Test-Path -LiteralPath $smokeRoot) {
      Remove-Item -LiteralPath $smokeRoot -Recurse -Force
    }
  }
}

Write-Host "Eve .NET package feed: $outputRoot"
Write-Host "GameCult.Eve.Surface: $version"
Write-Host "Clean PackageReference consumer: $(-not $SkipConsumerSmoke)"
