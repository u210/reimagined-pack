$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$target = Join-Path $project 'runtime\knowledge-test-server'
if (Test-Path $target) { throw 'Isolated test directory already exists; inspect it before reusing.' }
$data = Join-Path $target 'world\datapacks\chappy-fixture\data\minecraft\recipe'
New-Item -ItemType Directory -Path $data -Force | Out-Null
$utf8 = [Text.UTF8Encoding]::new($false)
$password = [guid]::NewGuid().ToString('N')
$props = @('server-ip=127.0.0.1','server-port=25576','level-name=world','view-distance=2','simulation-distance=2',
    'online-mode=true','enable-rcon=true','rcon.port=25586',('rcon.password='+$password),'motd=Chappy isolated recipe test')
[IO.File]::WriteAllLines((Join-Path $target 'server.properties'),$props,$utf8)
Copy-Item -LiteralPath (Join-Path $project 'runtime\server\eula.txt') -Destination $target
[IO.File]::WriteAllText((Join-Path $target 'world\datapacks\chappy-fixture\pack.mcmeta'),'{"pack":{"pack_format":48,"description":"Isolated Chappy recipe test"}}',$utf8)
[IO.File]::WriteAllText((Join-Path $data 'crafting_table.json'),'{"type":"minecraft:crafting_shaped","pattern":["##","##"],"key":{"#":{"item":"minecraft:cobblestone"}},"result":{"id":"minecraft:crafting_table","count":1}}',$utf8)
Write-Output 'Isolated recipe test prepared on 127.0.0.1:25576.'
