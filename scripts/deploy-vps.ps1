[CmdletBinding()]
param(
    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$SshAlias = 'kagoya-minecraft',
    [ValidatePattern('^https://')]
    [string]$PackUrl = 'https://u210.github.io/reimagined-pack/pack.toml',
    [switch]$ForcePlayers
)

$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$deployScript = Join-Path $repoRoot 'infra\deploy-vps.sh'
$sawmillPatch = Join-Path $repoRoot 'setup\sawmill-fix\sawmill-patched.jar'
$expectedPatchSha256 = '85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8'

if (-not (Test-Path -LiteralPath $deployScript -PathType Leaf)) {
    throw "Deployment script not found: $deployScript"
}
if (-not (Test-Path -LiteralPath $sawmillPatch -PathType Leaf)) {
    throw "Private Sawmill patch not found: $sawmillPatch"
}
$actualPatchSha256 = (Get-FileHash -LiteralPath $sawmillPatch -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualPatchSha256 -ne $expectedPatchSha256) {
    throw "Unexpected private Sawmill patch SHA256: $actualPatchSha256"
}

$uploadId = [guid]::NewGuid().ToString('N')
$remoteScript = "/tmp/reimagined-deploy-$uploadId.sh"
$remotePatch = "/tmp/reimagined-sawmill-$uploadId.jar"

try {
    & scp -- $deployScript "${SshAlias}:$remoteScript"
    if ($LASTEXITCODE -ne 0) { throw "Failed to upload deployment script (exit $LASTEXITCODE)" }
    & scp -- $sawmillPatch "${SshAlias}:$remotePatch"
    if ($LASTEXITCODE -ne 0) { throw "Failed to upload Sawmill patch (exit $LASTEXITCODE)" }

    $installCommand = "bash -n '$remoteScript' && install -m 0755 '$remoteScript' /usr/local/sbin/reimagined-deploy && mkdir -p /opt/reimagined-deploy/assets && install -m 0644 '$remotePatch' /opt/reimagined-deploy/assets/sawmill-patched.jar"
    & ssh $SshAlias $installCommand
    if ($LASTEXITCODE -ne 0) { throw "Failed to install VPS deployment assets (exit $LASTEXITCODE)" }

    $forceArgument = if ($ForcePlayers) { ' --force' } else { '' }
    & ssh $SshAlias "/usr/local/sbin/reimagined-deploy '$PackUrl'$forceArgument"
    if ($LASTEXITCODE -ne 0) { throw "VPS deployment failed (exit $LASTEXITCODE)" }
}
finally {
    & ssh $SshAlias "rm -f -- '$remoteScript' '$remotePatch'" 2>$null
}
