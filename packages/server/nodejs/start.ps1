Write-Host "=== PMNX Server - Node.js ==="

$env:REDIS_SERVER = if ($env:REDIS_SERVER) { $env:REDIS_SERVER } else { "redis://localhost:6379" }
$env:POSTGRESQL_SERVER = if ($env:POSTGRESQL_SERVER) { $env:POSTGRESQL_SERVER } else { "postgresql://localhost:5432/pmnx" }
$env:STORAGE_PATH = if ($env:STORAGE_PATH) { $env:STORAGE_PATH } else { "./data/storage" }
$env:HOST = if ($env:HOST) { $env:HOST } else { "http://localhost:3000" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "3000" }
$env:ALLOW_CORS = if ($env:ALLOW_CORS) { $env:ALLOW_CORS } else { "localhost" }
$env:PASSWORD_ITERATIONS = if ($env:PASSWORD_ITERATIONS) { $env:PASSWORD_ITERATIONS } else { "2000" }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[start] Starting server on $($env:HOST):$($env:PORT)..."
Set-Location $ScriptDir; node dist/index.js
