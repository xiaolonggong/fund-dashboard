$ErrorActionPreference = 'Stop'
trap {
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

$root = $PSScriptRoot
$url = 'http://127.0.0.1:51888'

Set-Location -LiteralPath $root

Write-Host ''
Write-Host ' Fund Dashboard'
Write-Host ' ------------------------------'

# --- Locate Node.js ---
# 1) Check if node.exe is already in system PATH
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  # 2) Fallback: search for WorkBuddy managed Node.js installations
  $wbNodeBase = Join-Path $env:USERPROFILE '.workbuddy\binaries\node\versions'
  $wbNode = $null
  if (Test-Path -LiteralPath $wbNodeBase) {
    $wbNode = Get-ChildItem -Path $wbNodeBase -Directory |
      Sort-Object Name -Descending |
      Select-Object -First 1 |
      Where-Object { Test-Path (Join-Path $_.FullName 'node.exe') }
  }
  if ($wbNode -and (Test-Path (Join-Path $wbNode.FullName 'node.exe'))) {
    Write-Host "[Info] Using WorkBuddy managed Node.js: $($wbNode.FullName)"
    $env:PATH = "$($wbNode.FullName);$env:PATH"
  } else {
    throw 'Node.js was not found. Install Node.js 20 or later: https://nodejs.org/'
  }
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw 'npm was not found. Reinstall Node.js and try again.'
}

try {
  $health = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 2
  if ($health.app -eq 'fund-dashboard') {
    Write-Host '[Ready] Fund Dashboard is already running. Opening the browser...'
    Start-Process $url
    exit 0
  }
} catch {
  # No running dashboard service; continue with startup checks.
}

$listener = Get-NetTCPConnection -LocalPort 51888 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  throw 'Port 51888 is already in use. Close the program using it and try again.'
}

if (-not (Test-Path -LiteralPath 'server\node_modules\koa\package.json')) {
  Write-Host '[Setup] Installing server dependencies. This may take a few minutes...'
  & npm.cmd install --prefix server
  if ($LASTEXITCODE -ne 0) {
    throw 'Server dependency installation failed. Check the network and try again.'
  }
}

if (-not (Test-Path -LiteralPath 'web\dist\index.html')) {
  if (-not (Test-Path -LiteralPath 'web\node_modules\react\package.json')) {
    Write-Host '[Setup] Installing web dependencies. This may take a few minutes...'
    & npm.cmd install --prefix web
    if ($LASTEXITCODE -ne 0) {
      throw 'Web dependency installation failed. Check the network and try again.'
    }
  }

  Write-Host '[Setup] Building the web app...'
  & npm.cmd run build --prefix web
  if ($LASTEXITCODE -ne 0) {
    throw 'Web build failed. Review the error above and try again.'
  }
}

$browserScript = Join-Path $root 'open-fund-dashboard.ps1'
Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-File', ('"{0}"' -f $browserScript)
) | Out-Null

Write-Host "[Start] $url"
Write-Host '[Tip] Keep this window open. Closing it stops the service.'
Write-Host ''

& node.exe 'server\src\index.js'
exit $LASTEXITCODE
