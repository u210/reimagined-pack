param([string]$InstanceName = 'Chappy-Dev')
$ErrorActionPreference = 'Stop'
if ($InstanceName -notmatch '^Chappy-Dev(?:-[A-Za-z0-9_-]+)?$') { throw 'Test instance name must start with Chappy-Dev.' }
$project = Split-Path $PSScriptRoot -Parent
$repo = Split-Path (Split-Path $project -Parent) -Parent
$prism = Join-Path $env:APPDATA 'PrismLauncher\instances'
$admin = Join-Path $prism 'Reimagined'
$testInstance = Join-Path $prism $InstanceName
$runtime = Join-Path $project 'runtime'
$server = Join-Path $runtime 'server'
$jar = Join-Path $project 'build\libs\chappy-0.1.0.jar'
if (!(Test-Path $jar)) { throw 'Build the mod first.' }
$marker = Join-Path $testInstance '.chappy-dev-owned'
if ((Test-Path $testInstance) -and !(Test-Path $marker)) { throw 'Refusing to change an existing unmarked Prism instance.' }
$eulaSource = Join-Path $repo 'eula.txt'
if (!(Test-Path $eulaSource) -or !(Select-String -LiteralPath $eulaSource -Pattern '^eula=true$' -Quiet)) {
    throw 'Existing Minecraft EULA acceptance was not found.'
}
$utf8 = [Text.UTF8Encoding]::new($false)
function Write-New([string]$Path, [string]$Text) {
    if (!(Test-Path -LiteralPath $Path)) { [IO.File]::WriteAllText($Path, $Text, $utf8) }
}
foreach ($dir in @($runtime, $server, (Join-Path $server 'config'), $testInstance, (Join-Path $testInstance 'minecraft\mods'))) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Write-New $marker 'Owned by development/chappy/scripts/prepare-local.ps1'
$envFile = Join-Path $runtime 'gateway.env'
if (!(Test-Path $envFile)) {
    $random = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($random) } finally { $rng.Dispose() }
    $token = [Convert]::ToBase64String($random)
    $codexExe = Get-ChildItem (Join-Path $env:APPDATA 'npm\node_modules\@openai\codex\node_modules') -Recurse -Filter codex.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    $lines = @('CHAPPY_BACKEND=mock', 'CHAPPY_AUTH=chatgpt', "CHAPPY_GATEWAY_TOKEN=$token", 'CHAPPY_PORT=18765')
    if ($codexExe) { $lines += ('CHAPPY_CODEX_BIN="' + $codexExe.FullName.Replace('\','/') + '"') }
    [IO.File]::WriteAllLines($envFile, $lines, $utf8)
}
$tokenLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^CHAPPY_GATEWAY_TOKEN=' } | Select-Object -First 1
if (!$tokenLine) { throw 'Gateway token not found.' }
$token = $tokenLine.Substring('CHAPPY_GATEWAY_TOKEN='.Length).Trim('"')
& (Join-Path $PSScriptRoot 'configure-local-gateway.ps1') -InstanceName $InstanceName
& node (Join-Path $project 'gateway\import-language.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Japanese language asset import failed.' }
Write-New (Join-Path $server 'eula.txt') (Get-Content -LiteralPath $eulaSource -Raw)
Write-New (Join-Path $server 'server.properties') @'
server-ip=127.0.0.1
server-port=25575
online-mode=true
max-players=4
view-distance=5
simulation-distance=4
motd=Chappy LOCAL development only
level-name=chappy-test-world
gamemode=creative
spawn-protection=0
enable-rcon=false
enable-query=false
'@
# Copy only launcher version metadata. Do not copy worlds, accounts, servers.dat or launch hooks.
if (!(Test-Path (Join-Path $testInstance 'mmc-pack.json'))) { Copy-Item -LiteralPath (Join-Path $admin 'mmc-pack.json') -Destination $testInstance }
Write-New (Join-Path $testInstance 'instance.cfg') @'
[General]
ConfigVersion=1.2
InstanceType=OneSix
name=Chappy ローカル開発
iconKey=default
ManagedPack=false
OverrideCommands=true
PreLaunchCommand=
PostExitCommand=
WrapperCommand=
OverrideMemory=true
MinMemAlloc=1024
MaxMemAlloc=4096
OverrideJavaLocation=false
JoinServerOnLaunch=false
'@
$destination = Join-Path $testInstance 'minecraft\mods\chappy-0.1.0.jar'
if (Test-Path $destination) {
    $backup = Join-Path $runtime ('backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    Copy-Item -LiteralPath $destination -Destination $backup
}
Copy-Item -LiteralPath $jar -Destination $destination
Copy-Item -LiteralPath (Join-Path $runtime 'deps\exposure-neoforge-1.21.1-1.9.18.jar') -Destination (Split-Path $destination -Parent)
Write-Output "Prism test instance: $testInstance"
Write-Output "Test server: $server (127.0.0.1:25575)"
Write-Output 'The administrator instance and production server were not modified.'
