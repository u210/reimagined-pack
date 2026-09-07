$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$repo = Split-Path (Split-Path $project -Parent) -Parent
$admin = Join-Path $env:APPDATA 'PrismLauncher\instances\Reimagined'
$client = Join-Path $env:APPDATA 'PrismLauncher\instances\Chappy-Dev-Reimagined'
$server = Join-Path $project 'runtime\integration-server'
if ((Test-Path $client) -or (Test-Path $server)) { throw 'Integration copy already exists; refusing to overwrite it.' }
$known = @{}
Get-ChildItem (Join-Path $repo 'pack\mods') -Filter *.pw.toml | ForEach-Object {
    $text = Get-Content -Raw $_.FullName
    if ($text -match '(?m)^filename\s*=\s*"([^"]+)"') {
        $name = $Matches[1]; $side = 'both'
        if ($text -match '(?m)^side\s*=\s*"([^"]+)"') { $side = $Matches[1] }
        $known[$name] = $side
    }
}
$mods = Get-ChildItem (Join-Path $admin 'minecraft\mods') -Filter *.jar
foreach ($mod in $mods) { if (!$known.ContainsKey($mod.Name)) { throw "Unclassified mod: $($mod.Name)" } }
foreach ($dir in @($client, "$client\minecraft\mods", "$server\mods", "$server\config")) { New-Item -ItemType Directory -Force $dir | Out-Null }
Set-Content -Encoding utf8 "$client\.chappy-dev-owned" 'Owned by Chappy integration preparation'
Copy-Item -LiteralPath "$admin\mmc-pack.json" -Destination $client
@'
[General]
ConfigVersion=1.2
InstanceType=OneSix
name=Chappy Reimagined 統合検証
iconKey=default
ManagedPack=false
OverrideCommands=true
PreLaunchCommand=
PostExitCommand=
WrapperCommand=
OverrideMemory=true
MinMemAlloc=1024
MaxMemAlloc=6144
JoinServerOnLaunch=false
'@ | Set-Content -Encoding utf8 "$client\instance.cfg"
foreach ($mod in $mods) {
    if ($known[$mod.Name] -ne 'server') { Copy-Item -LiteralPath $mod.FullName -Destination "$client\minecraft\mods" }
    if ($known[$mod.Name] -ne 'client') { Copy-Item -LiteralPath $mod.FullName -Destination "$server\mods" }
}
foreach ($folder in @('config','defaultconfigs','kubejs','datapacks')) {
    $source = Join-Path $admin "minecraft\$folder"
    if (Test-Path $source) {
        Copy-Item -LiteralPath $source -Destination "$client\minecraft" -Recurse
        # config exists already; copy its children to avoid config/config nesting.
        if ($folder -eq 'config') { Get-ChildItem -LiteralPath $source | Copy-Item -Destination "$server\config" -Recurse }
        else { Copy-Item -LiteralPath $source -Destination $server -Recurse }
    }
}
$sawmill = Join-Path $repo 'setup\sawmill-fix\sawmill-patched.jar'
if ((Get-FileHash $sawmill).Hash -ne '85EEBBEC566B9322A4A70223E3B9F53399D606F7A9B763CCCED4F7D4A73844F8') { throw 'Sawmill patch mismatch' }
Copy-Item -LiteralPath $sawmill -Destination "$server\mods\sawmill-neoforge-1.21-1.7.7.jar"
$cfg = "$server\config\sawmill-common.toml"
if (Test-Path $cfg) { (Get-Content -Raw $cfg) -replace 'sort_recipes\s*=\s*true','sort_recipes = false' | Set-Content -Encoding utf8 $cfg }
$mpi = Get-ChildItem "$server\mods" -Filter 'Multiplayer-Isolation*.jar' | Select-Object -First 1
if ($mpi) { Copy-Item -LiteralPath (Join-Path $repo 'dist\files\Multiplayer-Isolation-2.1-reimagined-2.jar') -Destination $mpi.FullName }
Copy-Item -LiteralPath "$project\runtime\deps\exposure-neoforge-1.21.1-1.9.18.jar" -Destination "$client\minecraft\mods"
Copy-Item -LiteralPath "$project\runtime\deps\exposure-neoforge-1.21.1-1.9.18.jar" -Destination "$server\mods"
Copy-Item -LiteralPath "$project\build\libs\chappy-0.1.0.jar" -Destination "$server\mods"
Copy-Item -LiteralPath "$repo\libraries" -Destination $server -Recurse
Copy-Item -LiteralPath "$project\build\libs\chappy-0.1.0.jar" -Destination "$client\minecraft\mods"
Copy-Item -LiteralPath "$repo\eula.txt" -Destination "$server\eula.txt"
@'
server-ip=127.0.0.1
server-port=25578
online-mode=true
level-name=integration-world
view-distance=4
simulation-distance=3
spawn-protection=0
motd=Chappy Reimagined local integration
enable-rcon=false
'@ | Set-Content -Encoding utf8 "$server\server.properties"
Copy-Item -LiteralPath "$project\runtime\server\config\chappy-common.toml" -Destination "$server\config"
Copy-Item -LiteralPath "$project\runtime\server\config\chappy-common.toml" -Destination "$client\minecraft\config"
$voiceConfig = "$server\config\plasmovoice\server\config.toml"
if (Test-Path $voiceConfig) {
    $voiceText = (Get-Content -Raw $voiceConfig) -replace '(?m)^ip = "0\.0\.0\.0"$','ip = "127.0.0.1"' -replace '(?m)^port = 0$','port = 25587'
    [IO.File]::WriteAllText($voiceConfig, $voiceText, [Text.UTF8Encoding]::new($false))
}
$manifest = [ordered]@{ client = $client; server = $server; clientMods = @(Get-ChildItem "$client\minecraft\mods" -Filter *.jar).Count; serverMods = @(Get-ChildItem "$server\mods" -Filter *.jar).Count; addedMods = @(@{id='exposure';version='1.9.18';side='both'},@{id='chappy';version='0.1.0';side='both'}); productionModified = $false }
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 "$project\runtime\integration-manifest.json"
$manifest | ConvertTo-Json -Depth 5
