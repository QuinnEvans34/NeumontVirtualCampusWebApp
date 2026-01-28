# Neumont Virtual Campus - one-click launcher
# Run from the repo root to start both server and client.

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting Neumont Virtual Campus..." -ForegroundColor Cyan
Write-Host "Repo root: $repoRoot"

# Start the Bun server in a new PowerShell window
Write-Host "Launching server (bun install + bun run dev)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path `"$repoRoot\\server`"; bun install; bun run dev"

# Give the server a moment to boot before starting the client
Start-Sleep -Seconds 2

# Start the Vite client in a new PowerShell window
Write-Host "Launching client (bun install + bun run dev)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path `"$repoRoot\\client`"; bun install; bun run dev"

Write-Host ""
Write-Host "All set!" -ForegroundColor Green
Write-Host "Client: http://localhost:5173"
Write-Host "Server health: http://localhost:3001/health"
Write-Host ""
Write-Host "To stop the app, close the two PowerShell windows that were opened."
