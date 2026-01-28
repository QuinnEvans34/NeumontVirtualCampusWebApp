# Neumont Virtual Campus - one-click launcher
# Run from the repo root to start both server and client.

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Neumont Virtual Campus..." -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot"

# Prerequisite checks
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Bun is not installed. Please install Bun from https://bun.sh and try again." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js/npm is not installed. Please install Node.js from https://nodejs.org and try again." -ForegroundColor Red
  exit 1
}

$serverPath = Join-Path $repoRoot "server"
$clientPath = Join-Path $repoRoot "client"

# Start the Bun server in a new PowerShell window
Write-Host "Launching server (bun install + bun run dev)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path `"$serverPath`"; bun install; bun run dev"

# Give the server a moment to boot before starting the client
Start-Sleep -Seconds 2

# Start the Vite client in a new PowerShell window (npm tooling)
Write-Host "Launching client (npm install + npm run dev)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path `"$clientPath`"; npm install; npm run dev"

Write-Host ""
Write-Host "All set!" -ForegroundColor Green
Write-Host "Client: http://localhost:5173"
Write-Host "Server health: http://localhost:3001/health"
Write-Host ""
Write-Host "To stop the app, close the two PowerShell windows that were opened."
