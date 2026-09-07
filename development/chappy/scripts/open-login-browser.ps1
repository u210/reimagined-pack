$ErrorActionPreference = 'Stop'
$loginFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'runtime\browser-login.json'
$deadline = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $loginFile) {
        $authUrl = (Get-Content -LiteralPath $loginFile -Raw | ConvertFrom-Json).authUrl
        $uri = [uri]$authUrl
        if ($uri.Scheme -ne 'https' -or $uri.Host -notin @('auth.openai.com','chatgpt.com')) { throw 'Unexpected authentication URL.' }
        # This browser is deliberately visible: the user must complete their own login.
        Start-Process -FilePath $authUrl
        exit 0
    }
    Start-Sleep -Milliseconds 300
}
throw 'Login URL did not become available.'
