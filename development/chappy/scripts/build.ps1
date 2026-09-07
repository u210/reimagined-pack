param([string]$Task = 'build')
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot 'prepare-dependencies.ps1')
$java = Join-Path $env:APPDATA 'PrismLauncher\java\java-runtime-delta'
if (!(Test-Path (Join-Path $java 'bin\javac.exe'))) { throw 'Java 21 JDK was not found.' }
$gradle = Get-ChildItem (Join-Path $env:USERPROFILE '.gradle\wrapper\dists\gradle-9.3.1-bin') -Recurse -Filter gradle.bat | Select-Object -First 1
if (!$gradle) { throw 'Install/configure Gradle 9.3.1 before building.' }
$previousJava = $env:JAVA_HOME
try {
    $env:JAVA_HOME = $java
    Push-Location $project
    try { & $gradle.FullName $Task '--console=plain'; if ($LASTEXITCODE -ne 0) { throw "Gradle failed: $LASTEXITCODE" } }
    finally { Pop-Location }
} finally { $env:JAVA_HOME = $previousJava }
