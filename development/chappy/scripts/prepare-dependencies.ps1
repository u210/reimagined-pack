$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$dir = Join-Path $project 'runtime\deps'
New-Item -ItemType Directory -Force $dir | Out-Null
$jar = Join-Path $dir 'exposure-neoforge-1.21.1-1.9.18.jar'
if (!(Test-Path $jar)) { Invoke-WebRequest 'https://cdn.modrinth.com/data/hB899VmG/versions/KZR7AUbh/exposure-neoforge-1.21.1-1.9.18.jar' -OutFile $jar }
if ((Get-FileHash $jar -Algorithm SHA512).Hash.ToLowerInvariant() -ne '2c0310cfbc9abfcf9e589fdf1079829253e47eb3ac84684a643951ebc432536a4e6f6567a67fc8ba4f4d55036e513804ff0996adee6a8a11cf59c76399de5ef6') { throw 'Exposure SHA512 mismatch' }
