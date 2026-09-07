$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$repo = Split-Path (Split-Path $project -Parent) -Parent
$server = Join-Path $project 'runtime\validation-server'
$marker = Join-Path $server '.chappy-validation-owned'
if ((Test-Path $server) -and !(Test-Path $marker)) { throw 'Existing unmarked validation directory; refusing to change it.' }
New-Item -ItemType Directory -Force $server | Out-Null
Set-Content -Encoding utf8 $marker 'Chappy isolated runtime checks'
Copy-Item -LiteralPath "$repo\eula.txt" -Destination "$server\eula.txt"
if (!(Test-Path "$server\server.properties")) {
    @'
server-ip=127.0.0.1
server-port=25577
online-mode=true
level-name=validation-world
view-distance=2
simulation-distance=2
spawn-protection=0
'@ | Set-Content -Encoding utf8 "$server\server.properties"
}
$result = Join-Path $server 'selftest-passed.txt'
if (Test-Path $result) { Remove-Item -LiteralPath $result }
& "$PSScriptRoot\build.ps1" -Task runValidationServer
if (!(Test-Path $result)) { throw 'Runtime checks failed; inspect validation-server/logs/latest.log.' }
Get-Content -LiteralPath $result
