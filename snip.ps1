$cliPath = Join-Path $PSScriptRoot 'cli.js'
& node $cliPath @args
exit $LASTEXITCODE