$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$server = Join-Path $project 'runtime\integration-server'
$java = Join-Path $env:APPDATA 'PrismLauncher\java\java-runtime-delta\bin\java.exe'
if (!(Test-Path "$server\libraries\net\neoforged\neoforge\21.1.244\win_args.txt")) { throw 'Prepare the standalone integration server first.' }
Push-Location $server
try { & $java '-Xms1G' '-Xmx6G' '@libraries/net/neoforged/neoforge/21.1.244/win_args.txt' '--nogui' }
finally { Pop-Location }
