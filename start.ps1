$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = "C:\Program Files\nodejs\node.exe"
$npmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"

if (!(Test-Path -LiteralPath $node)) {
  throw "Node.js was not found at $node"
}

if (!(Test-Path -LiteralPath $npmCli)) {
  throw "npm was not found at $npmCli"
}

Set-Location $projectRoot
& $node $npmCli install
& $node $npmCli run dev
