[CmdletBinding()]
param(
    [string]$OutputPath,
    [switch]$RefreshBootstrap
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$templateRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'client-template'))
$minecraftRoot = Join-Path $templateRoot 'minecraft'
$bootstrapPath = Join-Path $minecraftRoot 'packwiz-installer-bootstrap.jar'
$distRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'dist'))
$bootstrapUrl = 'https://github.com/packwiz/packwiz-installer-bootstrap/releases/download/v0.0.3/packwiz-installer-bootstrap.jar'
$bootstrapSha256 = 'a8fbb24dc604278e97f4688e82d3d91a318b98efc08d5dbfcbcbcab6443d116c'

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $distRoot 'Reimagined-Packwiz.zip'
}
$OutputPath = [IO.Path]::GetFullPath($OutputPath)

if (-not $templateRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe template path: $templateRoot"
}
if (-not $OutputPath.StartsWith($distRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Output must stay inside $distRoot"
}

New-Item -ItemType Directory -Path $minecraftRoot -Force | Out-Null
New-Item -ItemType Directory -Path $distRoot -Force | Out-Null

if ($RefreshBootstrap -or -not (Test-Path -LiteralPath $bootstrapPath -PathType Leaf)) {
    Invoke-WebRequest -Uri $bootstrapUrl -OutFile $bootstrapPath
}

$header = [IO.File]::ReadAllBytes($bootstrapPath) | Select-Object -First 2
if ($header.Count -ne 2 -or $header[0] -ne 0x50 -or $header[1] -ne 0x4B) {
    throw "Downloaded bootstrap is not a JAR/ZIP file: $bootstrapPath"
}
$actualBootstrapSha256 = (Get-FileHash -LiteralPath $bootstrapPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualBootstrapSha256 -ne $bootstrapSha256) {
    throw "Unexpected bootstrap SHA256: $actualBootstrapSha256"
}

if (Test-Path -LiteralPath $OutputPath -PathType Leaf) {
    Remove-Item -LiteralPath $OutputPath -Force
}

Compress-Archive -Path (Join-Path $templateRoot '*') -DestinationPath $OutputPath -CompressionLevel Optimal

$archive = [IO.Compression.ZipFile]::OpenRead($OutputPath)
try {
    $required = @('instance.cfg', 'mmc-pack.json', 'minecraft/packwiz-installer-bootstrap.jar')
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
    foreach ($entry in $required) {
        if ($entry -notin $entryNames) { throw "Bootstrap archive is missing $entry" }
    }
}
finally {
    $archive.Dispose()
}

$hash = (Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output "Built: $OutputPath"
Write-Output "SHA256: $hash"
