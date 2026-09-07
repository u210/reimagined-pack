$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $project 'runtime\gateway.env'
if (!(Test-Path $envFile)) { throw 'Run prepare-local.ps1 first.' }
$loginFile = Join-Path $project 'runtime\browser-login.json'
if (Test-Path -LiteralPath $loginFile) { Remove-Item -LiteralPath $loginFile }
# Run the browser helper in a hidden window while Node awaits the OAuth callback.
$helper = Join-Path $PSScriptRoot 'open-login-browser.ps1'
$shell = (Get-Process -Id $PID).Path
$opener = Start-Process -FilePath $shell -ArgumentList @('-NoProfile', '-File', ('"' + $helper + '"')) -WindowStyle Hidden -PassThru
try {
    & node "--env-file=$envFile" (Join-Path $project 'gateway\login-chatgpt.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Login failed: $LASTEXITCODE" }
} finally {
    if (!$opener.HasExited) { Stop-Process -Id $opener.Id -ErrorAction SilentlyContinue }
}
