param([string]$InstanceName = 'Chappy-Dev')
$ErrorActionPreference = 'Stop'
if ($InstanceName -notmatch '^Chappy-Dev(?:-[A-Za-z0-9_-]+)?$') { throw 'Only Chappy test instances may be configured.' }
$project = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $project 'runtime'
$instance = Join-Path $env:APPDATA ('PrismLauncher\instances\' + $InstanceName)
if (!(Test-Path -LiteralPath (Join-Path $instance '.chappy-dev-owned'))) { throw 'Test instance ownership marker missing.' }
$tokenLine = Get-Content -LiteralPath (Join-Path $runtime 'gateway.env') | Where-Object { $_ -match '^CHAPPY_GATEWAY_TOKEN=' } | Select-Object -First 1
if (!$tokenLine) { throw 'Gateway token missing.' }
$token = $tokenLine.Substring('CHAPPY_GATEWAY_TOKEN='.Length).Trim('"')
if ($token -notmatch '^[A-Za-z0-9+/=_-]{32,256}$') { throw 'Unsupported local gateway token format.' }
$utf8 = [Text.UTF8Encoding]::new($false)
$targets = @{
    server = Join-Path $runtime 'server\config\chappy-common.toml'
    singleplayer = Join-Path $instance 'minecraft\config\chappy-common.toml'
}
$envPath = Join-Path $runtime 'gateway.env'
$envLines = @(Get-Content -LiteralPath $envPath)
$knowledgeLine = $envLines | Where-Object { $_ -match '^CHAPPY_KNOWLEDGE_FILES_JSON=' } | Select-Object -First 1
$knowledgePaths = @()
if ($knowledgeLine) { $knowledgePaths = @($knowledgeLine.Substring('CHAPPY_KNOWLEDGE_FILES_JSON='.Length) | ConvertFrom-Json) }
$knowledgePaths = @($knowledgePaths + @((Join-Path $runtime 'server\chappy-knowledge.json'), (Join-Path $instance 'minecraft\chappy-knowledge.json')) | Select-Object -Unique)
$integrationServer = Join-Path $runtime 'integration-server'
if (Test-Path $integrationServer) {
    $integrationClient = Join-Path $env:APPDATA 'PrismLauncher\instances\Chappy-Dev-Reimagined\minecraft'
    $knowledgePaths = @($knowledgePaths + @((Join-Path $integrationServer 'chappy-knowledge.json'), (Join-Path $integrationClient 'chappy-knowledge.json')) | Select-Object -Unique)
}
if ($knowledgePaths.Count -gt 4) { throw 'Too many local knowledge sources; review gateway.env.' }
$newKnowledgeLine = 'CHAPPY_KNOWLEDGE_FILES_JSON=' + (ConvertTo-Json -Compress -InputObject $knowledgePaths)
if ($knowledgeLine -cne $newKnowledgeLine) {
    $backup = Join-Path $runtime ('backups\knowledge-config-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    Copy-Item -LiteralPath $envPath -Destination $backup
    $envLines = @($envLines | Where-Object { $_ -notmatch '^CHAPPY_KNOWLEDGE_FILES_JSON=' }) + $newKnowledgeLine
    [IO.File]::WriteAllLines($envPath, $envLines, $utf8)
    Write-Output 'Local knowledge source paths configured.'
}
foreach ($name in $targets.Keys) {
    $path = $targets[$name]
    New-Item -ItemType Directory -Force -Path (Split-Path $path -Parent) | Out-Null
    $before = if (Test-Path -LiteralPath $path) { [IO.File]::ReadAllText($path) } else { "maxGuides = 1`n" }
    $after = $before
    $values = @{ gatewayUrl = 'http://127.0.0.1:18765'; gatewayToken = $token }
    foreach ($key in $values.Keys) {
        $line = $key + ' = "' + $values[$key] + '"'
        $pattern = '(?m)^' + $key + '\s*=.*$'
        if ([regex]::IsMatch($after, $pattern)) { $after = [regex]::Replace($after, $pattern, [Text.RegularExpressions.MatchEvaluator]{param($m) $line}) }
        else { $after = $after.TrimEnd() + "`n" + $line + "`n" }
    }
    if ($before -cne $after -or !(Test-Path -LiteralPath $path)) {
        if (Test-Path -LiteralPath $path) {
            $backup = Join-Path $runtime ('backups\gateway-config-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '\' + $name)
            New-Item -ItemType Directory -Force -Path $backup | Out-Null
            Copy-Item -LiteralPath $path -Destination $backup
        }
        [IO.File]::WriteAllText($path, $after, $utf8)
        Write-Output "$name gateway configuration updated (existing file backed up)."
    } else { Write-Output "$name gateway configuration already matches." }
}
