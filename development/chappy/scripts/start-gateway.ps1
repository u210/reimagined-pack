$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $project 'runtime\gateway.env'
if (!(Test-Path $envFile)) { throw 'Run prepare-local.ps1 first.' }
& node "--env-file=$envFile" (Join-Path $project 'gateway\server.mjs')
if ($LASTEXITCODE -ne 0) { throw "Gateway failed: $LASTEXITCODE" }
