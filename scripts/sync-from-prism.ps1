[CmdletBinding()]
param(
    [string]$InstancePath = 'C:\Users\emb20\AppData\Roaming\PrismLauncher\instances\Reimagined',
    [switch]$DetectCurseForge
)

$ErrorActionPreference = 'Stop'

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'pack'))
$gameRoot = [IO.Path]::GetFullPath((Join-Path $InstancePath 'minecraft'))
$packwiz = Join-Path $repoRoot 'tools\packwiz.exe'

if (-not (Test-Path -LiteralPath $gameRoot -PathType Container)) {
    throw "Prism game directory not found: $gameRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $packRoot 'pack.toml') -PathType Leaf)) {
    throw "Packwiz pack not found: $packRoot"
}
if (-not (Test-Path -LiteralPath $packwiz -PathType Leaf)) {
    throw "Packwiz executable not found: $packwiz"
}
if (-not $packRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe pack path: $packRoot"
}

function Get-NormalizedRelativePath {
    param([string]$BasePath, [string]$FullName)
    return [IO.Path]::GetRelativePath($BasePath, $FullName).Replace('\', '/').ToLowerInvariant()
}

function Test-ExcludedSourcePath {
    param([string]$RelativePath)
    $p = $RelativePath.Replace('\', '/').ToLowerInvariant()
    return $p -match '(^|/)(\.ds_store|thumbs\.db)$' -or
        $p -match '(^|/)(cache|logs?|screenshots?|saves?|backups?)(/|$)' -or
        $p -match '\.(bak|log|tmp)$'
}

$managedDestinations = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
Get-ChildItem -LiteralPath $packRoot -Recurse -File -Filter '*.pw.toml' | ForEach-Object {
    $match = Select-String -LiteralPath $_.FullName -Pattern '^filename = "(.*)"$' | Select-Object -First 1
    if ($match) {
        $metaDir = Split-Path (Get-NormalizedRelativePath $packRoot $_.FullName) -Parent
        $filename = $match.Matches[0].Groups[1].Value
        $destination = if ([string]::IsNullOrEmpty($metaDir)) { $filename } else { "$metaDir/$filename" }
        [void]$managedDestinations.Add($destination.Replace('\', '/'))
    }
}

$trackedRoots = @(
    'config',
    'configureddefaults',
    'defaultconfigs',
    'kubejs',
    'datapacks',
    'resourcepacks',
    'shaderpacks',
    'moonlight-global-datapacks',
    'coremods',
    'tlm_custom_pack'
)

$copied = 0
$removed = 0

foreach ($rootName in $trackedRoots) {
    $sourceRoot = Join-Path $gameRoot $rootName
    $targetRoot = [IO.Path]::GetFullPath((Join-Path $packRoot $rootName))
    if (-not $targetRoot.StartsWith($packRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Unsafe sync target: $targetRoot"
    }

    $sourceFiles = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    if (Test-Path -LiteralPath $sourceRoot -PathType Container) {
        Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | ForEach-Object {
            $withinRoot = Get-NormalizedRelativePath $sourceRoot $_.FullName
            $packRelative = "$rootName/$withinRoot"
            if (-not (Test-ExcludedSourcePath $packRelative) -and -not $managedDestinations.Contains($packRelative)) {
                [void]$sourceFiles.Add($withinRoot)
                $destination = Join-Path $targetRoot $withinRoot
                $destinationDir = Split-Path $destination -Parent
                New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
                Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
                $copied++
            }
        }
    }

    if (Test-Path -LiteralPath $targetRoot -PathType Container) {
        Get-ChildItem -LiteralPath $targetRoot -Recurse -File | ForEach-Object {
            $withinRoot = Get-NormalizedRelativePath $targetRoot $_.FullName
            $packRelative = "$rootName/$withinRoot"
            if ($_.Name -notlike '*.pw.toml' -and
                -not $managedDestinations.Contains($packRelative) -and
                -not $sourceFiles.Contains($withinRoot)) {
                $resolved = [IO.Path]::GetFullPath($_.FullName)
                if (-not $resolved.StartsWith($targetRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to remove file outside tracked root: $resolved"
                }
                Remove-Item -LiteralPath $resolved -Force
                $removed++
            }
        }
    }
}

$modsSource = Join-Path $gameRoot 'mods'
$modsTarget = Join-Path $packRoot 'mods'
$activeModNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
Get-ChildItem -LiteralPath $modsSource -File -Filter '*.jar' | ForEach-Object {
    [void]$activeModNames.Add($_.Name)
    $packRelative = "mods/$($_.Name)"
    if (-not $managedDestinations.Contains($packRelative)) {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $modsTarget $_.Name) -Force
        $copied++
    }
}

Get-ChildItem -LiteralPath $modsTarget -File -Filter '*.jar' | ForEach-Object {
    if (-not $activeModNames.Contains($_.Name)) {
        $resolved = [IO.Path]::GetFullPath($_.FullName)
        if (-not $resolved.StartsWith([IO.Path]::GetFullPath($modsTarget) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove file outside mods directory: $resolved"
        }
        Remove-Item -LiteralPath $resolved -Force
        $removed++
    }
}

Push-Location $packRoot
try {
    if ($DetectCurseForge) {
        & $packwiz -y curseforge detect
        if ($LASTEXITCODE -ne 0) { throw "packwiz curseforge detect failed with exit code $LASTEXITCODE" }
    }
    & $packwiz refresh
    if ($LASTEXITCODE -ne 0) { throw "packwiz refresh failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

Write-Output "Pack sync complete: copied=$copied removed=$removed"
Write-Output "Source: $gameRoot"
Write-Output "Pack:   $packRoot"
