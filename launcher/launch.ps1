param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$stateRoot = Join-Path $projectRoot ".local-tools"
$pidPath = Join-Path $stateRoot "server.pid"
$outputLogPath = Join-Path $stateRoot "server.out.log"
$errorLogPath = Join-Path $stateRoot "server.error.log"
$serverUrl = "http://127.0.0.1:3000"

New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null

function Test-ServerReady {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $connect = $client.BeginConnect("127.0.0.1", 3000, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(300)) { return $false }
    $client.EndConnect($connect)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function Open-Blog {
  if (-not $NoBrowser) { Start-Process $serverUrl }
}

function Show-LaunchError([string]$detail) {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
      "Starlog AI 서버를 시작하지 못했습니다.`r`n`r`n$detail`r`n`r`n로그: .local-tools\server.error.log",
      "Starlog AI",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
  } catch {
    # The launcher is intentionally windowless; logs remain available on failure.
  }
}

if (Test-ServerReady) {
  Open-Blog
  exit 0
}

$trackedProcess = $null
if (Test-Path -LiteralPath $pidPath) {
  $savedPid = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($savedPid -as [int]) { $trackedProcess = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue }
}

if (-not $trackedProcess) {
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $outputLogPath, $errorLogPath -Force -ErrorAction SilentlyContinue
  $serverScript = Join-Path $PSScriptRoot "server.ps1"
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$serverScript`""

  try {
    $trackedProcess = Start-Process `
      -FilePath "powershell.exe" `
      -ArgumentList $arguments `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $outputLogPath `
      -RedirectStandardError $errorLogPath `
      -PassThru
    Set-Content -LiteralPath $pidPath -Value $trackedProcess.Id
  } catch {
    Show-LaunchError $_.Exception.Message
    exit 1
  }
}

for ($attempt = 0; $attempt -lt 300; $attempt += 1) {
  if (Test-ServerReady) {
    Open-Blog
    exit 0
  }
  if ($trackedProcess.HasExited) { break }
  Start-Sleep -Seconds 1
  $trackedProcess.Refresh()
}

$errorDetail = "서버 프로세스가 준비되기 전에 종료되었습니다."
if (Test-Path -LiteralPath $errorLogPath) {
  $lastError = Get-Content -LiteralPath $errorLogPath -Tail 8 -ErrorAction SilentlyContinue | Out-String
  if ($lastError.Trim()) { $errorDetail = $lastError.Trim() }
}
Show-LaunchError $errorDetail
exit 1
