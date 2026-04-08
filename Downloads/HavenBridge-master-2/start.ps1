# HavenBridge — Start both backend and frontend
# Usage: .\start.ps1

Write-Host ""
Write-Host "  HavenBridge - Starting..." -ForegroundColor Cyan
Write-Host ""

# Install frontend dependencies if needed
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location frontend
    npm install
    Pop-Location
} else {
    Write-Host "  Frontend dependencies already installed." -ForegroundColor Green
}

# Kill any leftover processes on our ports
Get-NetTCPConnection -LocalPort 5149 -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -ne 0 } |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -ne 0 } |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# Start backend in background
Write-Host "  Starting backend API (http://localhost:5149)..." -ForegroundColor Yellow
$backend = Start-Process -PassThru -NoNewWindow -FilePath "dotnet" -ArgumentList "run" -WorkingDirectory "HavenBridge.Api"

# Give the backend a moment to start before launching frontend
Start-Sleep -Seconds 3

# Start frontend in background (use cmd /c for npm on Windows)
Write-Host "  Starting frontend (http://localhost:5173)..." -ForegroundColor Yellow
$frontend = Start-Process -PassThru -NoNewWindow -FilePath "cmd" -ArgumentList "/c","npm run dev" -WorkingDirectory "frontend"

Write-Host ""
Write-Host '  Both servers running!' -ForegroundColor Green
Write-Host '  Frontend:  http://localhost:5173' -ForegroundColor White
Write-Host '  Backend:   http://localhost:5149' -ForegroundColor White
Write-Host '  Database:  MySQL (localhost:3306/havenbridge)' -ForegroundColor White
Write-Host ""
Write-Host '  Press Ctrl+C to stop both servers.' -ForegroundColor DarkGray
Write-Host ""

try {
    $backend.WaitForExit()
} finally {
    if ($frontend -and -not $frontend.HasExited) { Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue }
    if ($backend -and -not $backend.HasExited) { Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue }
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -ge (Get-Date).AddMinutes(-60) } | Stop-Process -Force -ErrorAction SilentlyContinue
}
