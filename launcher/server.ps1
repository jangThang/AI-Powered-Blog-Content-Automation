param(
  [switch]$SetupOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot ".local-tools"

function Find-NpmCommand {
  $installed = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($installed) { return $installed.Source }

  if (Test-Path -LiteralPath $toolsRoot) {
    $portable = Get-ChildItem -LiteralPath $toolsRoot -Directory -Filter "node-v*-win-x64" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending |
      ForEach-Object {
        $npmCommand = Join-Path $_.FullName "npm.cmd"
        if (Test-Path -LiteralPath $npmCommand) { return $npmCommand }

        # Node.js 24 portable archives ship npm's JavaScript package but omit
        # the npm.cmd launcher. Restore the small launcher expected below.
        $nodeCommand = Join-Path $_.FullName "node.exe"
        $npmCli = Join-Path $_.FullName "node_modules\npm\bin\npm-cli.js"
        if ((Test-Path -LiteralPath $nodeCommand) -and (Test-Path -LiteralPath $npmCli)) {
          Set-Content -LiteralPath $npmCommand -Encoding Ascii -Value "@echo off`r`n`"%~dp0node.exe`" `"%~dp0node_modules\npm\bin\npm-cli.js`" %*`r`n"
          return $npmCommand
        }
      } |
      Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
      Select-Object -First 1
    if ($portable) { return $portable }
  }
  return $null
}

function Find-CodexCommand {
  if ($env:CODEX_CLI_PATH -and (Test-Path -LiteralPath $env:CODEX_CLI_PATH)) {
    return (Resolve-Path -LiteralPath $env:CODEX_CLI_PATH).Path
  }

  $installed = Get-Command codex.exe -ErrorAction SilentlyContinue
  if (-not $installed) { $installed = Get-Command codex -ErrorAction SilentlyContinue }
  if ($installed -and $installed.Source -and (Test-Path -LiteralPath $installed.Source)) {
    return $installed.Source
  }

  $extensionRoots = @(
    (Join-Path $env:USERPROFILE ".vscode\extensions"),
    (Join-Path $env:USERPROFILE ".vscode-insiders\extensions"),
    (Join-Path $env:USERPROFILE ".cursor\extensions")
  )

  foreach ($extensionRoot in $extensionRoots) {
    if (-not (Test-Path -LiteralPath $extensionRoot)) { continue }
    $extensions = Get-ChildItem -LiteralPath $extensionRoot -Directory -Filter "openai.chatgpt-*" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending
    foreach ($extension in $extensions) {
      $candidate = Get-ChildItem -LiteralPath (Join-Path $extension.FullName "bin") -File -Filter "codex.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($candidate) { return $candidate.FullName }
    }
  }

  $codeCommand = Get-Command code -ErrorAction SilentlyContinue
  if ($codeCommand) {
    $extensionPath = (& $codeCommand.Source --locate-extension openai.chatgpt 2>$null | Select-Object -First 1)
    if ($extensionPath -and (Test-Path -LiteralPath $extensionPath)) {
      $candidate = Get-ChildItem -LiteralPath (Join-Path $extensionPath "bin") -File -Filter "codex.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($candidate) { return $candidate.FullName }
    }
  }

  return $null
}

function Install-PortableNode {
  Write-Host "Node.js was not found. Preparing a project-local LTS runtime..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $toolsRoot -Force | Out-Null

  $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 30
  $release = $index | Where-Object { $_.lts } | Select-Object -First 1
  if (-not $release) { throw "Could not retrieve Node.js LTS release information." }

  $version = $release.version
  $archiveName = "node-$version-win-x64.zip"
  $archivePath = Join-Path $toolsRoot $archiveName
  $checksumPath = Join-Path $toolsRoot "SHASUMS256-$version.txt"
  $baseUrl = "https://nodejs.org/dist/$version"

  Invoke-WebRequest -Uri "$baseUrl/$archiveName" -OutFile $archivePath -UseBasicParsing -TimeoutSec 180
  Invoke-WebRequest -Uri "$baseUrl/SHASUMS256.txt" -OutFile $checksumPath -UseBasicParsing -TimeoutSec 30

  $expectedLine = Get-Content -LiteralPath $checksumPath | Where-Object { $_ -match ([regex]::Escape($archiveName) + '$') } | Select-Object -First 1
  if (-not $expectedLine) { throw "Could not find the Node.js download checksum." }
  $expectedHash = ($expectedLine -split '\s+')[0].ToUpperInvariant()
  $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToUpperInvariant()
  if ($actualHash -ne $expectedHash) { throw "Node.js download verification failed." }

  Expand-Archive -LiteralPath $archivePath -DestinationPath $toolsRoot -Force
  $npmPath = Join-Path $toolsRoot "node-$version-win-x64\npm.cmd"
  $nodePath = Join-Path $toolsRoot "node-$version-win-x64\node.exe"
  $npmCliPath = Join-Path $toolsRoot "node-$version-win-x64\node_modules\npm\bin\npm-cli.js"
  if ((Test-Path -LiteralPath $nodePath) -and (Test-Path -LiteralPath $npmCliPath)) {
    Set-Content -LiteralPath $npmPath -Encoding Ascii -Value "@echo off`r`n`"%~dp0node.exe`" `"%~dp0node_modules\npm\bin\npm-cli.js`" %*`r`n"
  }
  if (-not (Test-Path -LiteralPath $npmPath)) { throw "Could not extract the Node.js archive." }
  return $npmPath
}

$codexPath = Find-CodexCommand

if ($codexPath -and (Test-Path -LiteralPath $codexPath)) {
  Write-Host "Using Codex CLI: $codexPath" -ForegroundColor DarkGray
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $codexPath login status *> $null
  $codexLoginExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($codexLoginExitCode -eq 0) {
    $env:CODEX_CLI_PATH = $codexPath
  } else {
    Write-Warning "Codex login is not ready. The built-in demo is still available; AI generation will remain disabled until you run 'codex login'."
  }
} else {
  Write-Warning "Codex CLI was not found. The built-in demo is still available; install Codex only when you want to generate a new draft."
}

$npmPath = Find-NpmCommand
if (-not $npmPath) { $npmPath = Install-PortableNode }
$nodeDir = Split-Path -Parent $npmPath
$env:PATH = $nodeDir + [IO.Path]::PathSeparator + $env:PATH

Set-Location -LiteralPath $projectRoot
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot "node_modules\next"))) {
  Write-Host "Installing project dependencies..." -ForegroundColor Cyan
  & $npmPath ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed." }
}

if ($SetupOnly) {
  Write-Host "Setup complete: the local runtime is ready." -ForegroundColor Green
  exit 0
}

Write-Host "Starting Starlog AI. Press Ctrl+C to stop." -ForegroundColor Green
& $npmPath run dev
