[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$SourceJar,
    [Parameter(Mandatory)][string]$OutputJar
)

$ErrorActionPreference = 'Stop'
$expected = 'ea515cbf6decc91c246043eb83f4c719b0879e45f972a6516c9bf9ac91e7df19f572a9653cf6accbfa33b01641c6439d58ebc7d8afdec232b4d2637393b9f8a9'
if ((Get-FileHash -LiteralPath $SourceJar -Algorithm SHA512).Hash.ToLowerInvariant() -ne $expected) {
    throw 'Expected official Unloaded Activity 0.7.2+mc1.21-1.21.1 JAR'
}
if (Test-Path -LiteralPath $OutputJar) { throw 'Output already exists' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$source = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($SourceJar))
$configPath = 'unloadedactivity.mixins_neoforge.json'
$names = @('block_entities.AbstractFurnaceBlockEntityMixin', 'entities.AgeableMobMixin', 'entities.SheepMixin')
try {
    if (@($source.Entries | Where-Object FullName -Match '^META-INF/.*\.(SF|RSA|DSA)$').Count) {
        throw 'Refusing to modify a signed JAR'
    }
    $entry = $source.GetEntry($configPath)
    $timestamp = $entry.LastWriteTime
    $reader = [IO.StreamReader]::new($entry.Open())
    try { $original = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $patched = $original
    foreach ($name in $names) {
        if (@(($original | ConvertFrom-Json).mixins | Where-Object { $_ -eq $name }).Count -ne 1) {
            throw "Unexpected mixin list: $name"
        }
        $class = 'dev/moono/unloadedactivity/mixin/' + $name.Replace('.', '/') + '_neoforge.class'
        if (-not $source.GetEntry($class)) { throw "Missing NeoForge implementation: $class" }
        $patched = $patched.Replace('"' + $name + '"', '"' + $name + '_neoforge"')
    }
} finally { $source.Dispose() }
Copy-Item -LiteralPath $SourceJar -Destination $OutputJar
$archive = [IO.Compression.ZipFile]::Open([IO.Path]::GetFullPath($OutputJar), [IO.Compression.ZipArchiveMode]::Update)
try {
    $archive.GetEntry($configPath).Delete()
    $entry = $archive.CreateEntry($configPath)
    $entry.LastWriteTime = $timestamp
    $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
    try { $writer.Write($patched) } finally { $writer.Dispose() }
} finally { $archive.Dispose() }

# Every entry other than the one configuration file must be byte-identical.
$source = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($SourceJar))
$output = [IO.Compression.ZipFile]::OpenRead([IO.Path]::GetFullPath($OutputJar))
try {
    if ($source.Entries.Count -ne $output.Entries.Count) { throw 'Entry count changed' }
    foreach ($entry in $source.Entries) {
        if ($entry.FullName -eq $configPath) { continue }
        $other = $output.GetEntry($entry.FullName)
        if (-not $other) { throw "Missing output entry: $($entry.FullName)" }
        $left = $entry.Open(); $right = $other.Open()
        try {
            $leftHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($left))
            $rightHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($right))
            if ($leftHash -ne $rightHash) { throw "Unexpected entry change: $($entry.FullName)" }
        } finally { $left.Dispose(); $right.Dispose() }
    }
} finally { $source.Dispose(); $output.Dispose() }
Get-FileHash -LiteralPath $OutputJar -Algorithm SHA256
