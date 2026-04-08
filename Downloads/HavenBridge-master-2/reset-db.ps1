# HavenBridge — Reset the MySQL database
# Drops and recreates the database so it gets re-seeded from CSV files on next startup.
# Usage: .\reset-db.ps1

Write-Host ""
Write-Host "  HavenBridge - Database Reset (MySQL)" -ForegroundColor Cyan
Write-Host ""

# Stop the backend if running
$running = Get-Process -Name "HavenBridge.Api" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "  Stopping running backend..." -ForegroundColor Yellow
    $running | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Read connection details from appsettings.json
$configPath = "HavenBridge.Api\appsettings.json"
if (-not (Test-Path $configPath)) {
    Write-Host "  ERROR - Cannot find $configPath" -ForegroundColor Red
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json
$connStr = $config.ConnectionStrings.DefaultConnection

# Parse connection string
$server = "localhost"
$port = "3306"
$user = "root"
$password = ""
$database = "havenbridge"

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

Write-Host "  Dropping and recreating database '$database'..." -ForegroundColor Yellow

$mysqlArgs = @("-h", $server, "-P", $port, "-u", $user)
if ($password) { $mysqlArgs += "--password=$password" }
$mysqlArgs += "-e"
$mysqlArgs += "DROP DATABASE IF EXISTS ``$database``; CREATE DATABASE ``$database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Resolve mysql executable (PATH or common install locations)
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
    Write-Host "  ERROR - Could not find 'mysql'. Install MySQL and add it to PATH, or install to the default location." -ForegroundColor Red
    exit 1
}

try {
    & $mysqlCmd @mysqlArgs 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK - Database '$database' reset successfully." -ForegroundColor Green
    } else {
        Write-Host '  ERROR - MySQL command failed. Is MySQL running and are your credentials correct?' -ForegroundColor Red
        Write-Host "      Connection: ${server}:${port} as $user" -ForegroundColor DarkGray
        exit 1
    }
} catch {
    Write-Host "  ERROR - Could not find 'mysql' command. Make sure MySQL client is installed and in your PATH." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host '  Done! The database will be re-created from CSV seed data' -ForegroundColor Green
Write-Host '  the next time you start the backend.' -ForegroundColor Green
Write-Host ""
