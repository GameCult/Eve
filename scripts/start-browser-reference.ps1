param(
  [int] $Port = 8891
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $projectRoot "web"
$logRoot = Join-Path $projectRoot "artifacts\web"
New-Item -ItemType Directory -Force $logRoot | Out-Null

$pidPath = Join-Path $logRoot "eve-browser-reference.pid"
$outLog = Join-Path $logRoot "eve-browser-reference.out.log"
$errLog = Join-Path $logRoot "eve-browser-reference.err.log"

if (Test-Path $pidPath) {
  $oldPid = Get-Content $pidPath -ErrorAction SilentlyContinue
  if ($oldPid) {
    Stop-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue
  }
}

$nodeScript = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const port = Number(process.argv[3]);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const clean = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.normalize(path.join(root, clean));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Eve browser reference listening on http://127.0.0.1:${port}`));
'@

$scriptPath = Join-Path $logRoot "serve-eve-reference.cjs"
Set-Content -LiteralPath $scriptPath -Value $nodeScript -Encoding UTF8
$proc = Start-Process -FilePath "node" -ArgumentList @($scriptPath, $webRoot, $Port) -WorkingDirectory $projectRoot -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru -WindowStyle Hidden
$proc.Id | Set-Content -LiteralPath $pidPath
Start-Sleep -Milliseconds 500
Get-Content $outLog -Tail 5
Write-Host "PID $($proc.Id)"
