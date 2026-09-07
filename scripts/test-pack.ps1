[CmdletBinding()]
param(
    [string]$InstancePath = 'C:\Users\emb20\AppData\Roaming\PrismLauncher\instances\Reimagined'
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packRoot = Join-Path $repoRoot 'pack'
$gameRoot = Join-Path $InstancePath 'minecraft'
$distributionPath = Join-Path $repoRoot 'distribution.toml'

function Get-RelativePackPath([string]$Path) {
    return [IO.Path]::GetRelativePath($packRoot, $Path).Replace('\', '/')
}

$errors = [Collections.Generic.List[string]]::new()
$metafiles = Get-ChildItem -LiteralPath $packRoot -Recurse -File -Filter '*.pw.toml'
$metaByPath = @{}
$managedModNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$serverOnlyModNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)

foreach ($meta in $metafiles) {
    $relative = Get-RelativePackPath $meta.FullName
    $text = Get-Content -LiteralPath $meta.FullName -Raw
    $filenameMatch = [regex]::Match($text, '(?m)^filename = "(.*)"$')
    $sideMatch = [regex]::Match($text, '(?m)^side = "(client|server|both)"$')
    if (-not $filenameMatch.Success) { $errors.Add("Missing filename: $relative"); continue }
    if (-not $sideMatch.Success) { $errors.Add("Missing/invalid side: $relative"); continue }
    $metaByPath[$relative] = $sideMatch.Groups[1].Value
    if ($relative.StartsWith('mods/', [StringComparison]::OrdinalIgnoreCase)) {
        [void]$managedModNames.Add($filenameMatch.Groups[1].Value)
        if ($sideMatch.Groups[1].Value -eq 'server') {
            [void]$serverOnlyModNames.Add($filenameMatch.Groups[1].Value)
        }
    }
}

$distribution = @{}
$section = $null
foreach ($line in Get-Content -LiteralPath $distributionPath) {
    if ($line -match '^\[metafiles\.(client|server|both)\]$') {
        $section = $Matches[1]
        continue
    }
    if ($line -match '^\[') { $section = $null; continue }
    if ($section -and $line -match '^\s*"([^"]+\.pw\.toml)",\s*$') {
        $path = $Matches[1]
        if ($distribution.ContainsKey($path)) {
            $errors.Add("Duplicate distribution entry: $path")
        }
        $distribution[$path] = $section
    }
}

foreach ($path in $metaByPath.Keys) {
    if (-not $distribution.ContainsKey($path)) {
        $errors.Add("Metafile absent from distribution.toml: $path")
    }
    elseif ($distribution[$path] -ne $metaByPath[$path]) {
        $errors.Add("Side mismatch for ${path}: metadata=$($metaByPath[$path]) registry=$($distribution[$path])")
    }
}
foreach ($path in $distribution.Keys) {
    if (-not $metaByPath.ContainsKey($path)) {
        $errors.Add("Stale distribution entry: $path")
    }
}

$rawMods = Get-ChildItem -LiteralPath (Join-Path $packRoot 'mods') -File -Filter '*.jar'
foreach ($raw in $rawMods) { [void]$managedModNames.Add($raw.Name) }
$activeMods = Get-ChildItem -LiteralPath (Join-Path $gameRoot 'mods') -File -Filter '*.jar' | Select-Object -ExpandProperty Name
foreach ($name in $activeMods) {
    if (-not $managedModNames.Contains($name)) { $errors.Add("Active Prism mod missing from pack: $name") }
}
foreach ($name in $managedModNames) {
    if ($name -notin $activeMods -and -not $serverOnlyModNames.Contains($name)) {
        $errors.Add("Pack mod is not active in Prism: $name")
    }
}

$forbidden = @(
    'options.txt', 'servers.dat', 'servers.dat_old', 'usercache.json',
    'saves/', 'logs/', 'screenshots/', 'world/', '.world-host-cache/'
)
$indexText = Get-Content -LiteralPath (Join-Path $packRoot 'index.toml') -Raw
foreach ($path in $forbidden) {
    if ($indexText -match ('(?im)^file = "' + [regex]::Escape($path))) {
        $errors.Add("Forbidden personal/runtime path in index: $path")
    }
}

$indexHash = (Get-FileHash -LiteralPath (Join-Path $packRoot 'index.toml') -Algorithm SHA256).Hash.ToLowerInvariant()
$packText = Get-Content -LiteralPath (Join-Path $packRoot 'pack.toml') -Raw
$declaredHash = [regex]::Match($packText, '(?ms)^\[index\].*?^hash = "([0-9a-f]+)"$').Groups[1].Value
if ($indexHash -ne $declaredHash) {
    $errors.Add("pack.toml index hash mismatch: declared=$declaredHash actual=$indexHash")
}

$indexedPaths = [regex]::Matches($indexText, '(?m)^file = "([^"]+)"$') | ForEach-Object { $_.Groups[1].Value }
foreach ($relative in $indexedPaths) {
    $localPath = Join-Path $packRoot $relative
    if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) {
        $errors.Add("Indexed file missing on disk: $relative")
    }
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    throw "Pack validation failed with $($errors.Count) error(s)."
}

$sideCounts = $metaByPath.Values | Group-Object | Sort-Object Name
Write-Output 'Pack validation passed.'
Write-Output "Active mods covered: $($activeMods.Count)"
Write-Output "Metafiles: $($metafiles.Count); raw local mods: $($rawMods.Count); indexed files: $($indexedPaths.Count)"
$sideCounts | ForEach-Object { Write-Output "Side $($_.Name): $($_.Count) metafiles" }
