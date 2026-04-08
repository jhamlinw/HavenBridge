# HavenBridge — First-time setup
# Installs all dependencies, verifies prerequisites, and creates the MySQL database.
# Usage: .\setup.ps1

Write-Host ""
Write-Host "  HavenBridge - First-Time Setup" -ForegroundColor Cyan
Write-Host ""

# Check .NET SDK
$dotnetVersion = dotnet --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host '  [X] .NET SDK not found. Install from https://dotnet.microsoft.com/download' -ForegroundColor Red
    exit 1
} else {
    Write-Host "  [OK] .NET SDK $dotnetVersion" -ForegroundColor Green
}

# Check Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host '  [X] Node.js not found. Install from https://nodejs.org/' -ForegroundColor Red
    exit 1
} else {
    Write-Host "  [OK] Node.js $nodeVersion" -ForegroundColor Green
}

# Check MySQL — try PATH first, then common install locations
$mysqlCmd = Get-Command mysql -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $mysqlCmd) {
    $candidates = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
    )
    $mysqlCmd = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $mysqlCmd) {
    Write-Host '  [X] MySQL client not found. Install MySQL 8+ from https://dev.mysql.com/downloads/' -ForegroundColor Red
    Write-Host "      Make sure 'mysql' is in your PATH or installed to the default location." -ForegroundColor DarkGray
    exit 1
} else {
    $mysqlVersion = & $mysqlCmd --version 2>$null
    Write-Host "  [OK] $mysqlVersion" -ForegroundColor Green
}

# Create the MySQL database if it doesn't already exist
Write-Host ""
Write-Host "  Creating MySQL database 'havenbridge' (if needed)..." -ForegroundColor Yellow

$configPath = "HavenBridge.Api\appsettings.json"
$config = Get-Content $configPath | ConvertFrom-Json
$connStr = $config.ConnectionStrings.DefaultConnection

$server = "localhost"; $port = "3306"; $user = "root"; $password = ""; $database = "havenbridge"
foreach ($part in $connStr.Split(';')) {
    $kv = $part.Split('=', 2)
    if ($kv.Length -eq 2) {
        switch ($kv[0].Trim().ToLower()) {
            "server"   { $server = $kv[1].Trim() }
            "port"     { $port = $kv[1].Trim() }
            "user"     { $user = $kv[1].Trim() }
            "password" { $password = $kv[1].Trim() }
            "database" { $database = $kv[1].Trim() }
        }
    }
}

$mysqlArgs = @("-h", $server, "-P", $port, "-u", $user)
if ($password) { $mysqlArgs += "--password=$password" }
$mysqlArgs += "-e"
$mysqlArgs += "CREATE DATABASE IF NOT EXISTS ``$database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

try {
    & $mysqlCmd @mysqlArgs 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - Database '$database' ready." -ForegroundColor Green
    } else {
        Write-Host '  WARNING - Could not create database. Make sure MySQL is running.' -ForegroundColor Yellow
        Write-Host '      You can create it manually: CREATE DATABASE havenbridge;' -ForegroundColor DarkGray
    }
} catch {
    Write-Host '  WARNING - Could not run mysql command. Create the database manually if needed.' -ForegroundColor Yellow
}

# Restore .NET packages
Write-Host ""
Write-Host "  Restoring .NET packages..." -ForegroundColor Yellow
dotnet restore HavenBridge.Api
Write-Host '  OK - .NET packages restored' -ForegroundColor Green

# Install frontend dependencies
Write-Host ""
Write-Host "  Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location frontend
npm install
Pop-Location
Write-Host '  OK - Frontend dependencies installed' -ForegroundColor Green

Write-Host ""
Write-Host '  Setup complete! Run .\start.ps1 to launch the app.' -ForegroundColor Green
Write-Host ""
