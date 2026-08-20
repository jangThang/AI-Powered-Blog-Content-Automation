$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$sourcePath = Join-Path $PSScriptRoot "StarlogLauncher.cs"
$outputPath = Join-Path $projectRoot "Starlog.exe"

if (Test-Path -LiteralPath $outputPath) {
  Remove-Item -LiteralPath $outputPath -Force
}

Add-Type `
  -TypeDefinition (Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8) `
  -Language CSharp `
  -OutputAssembly $outputPath `
  -OutputType WindowsApplication `
  -ReferencedAssemblies "System.dll", "System.Windows.Forms.dll"

Unblock-File -LiteralPath $outputPath -ErrorAction SilentlyContinue
Write-Host "Created: $outputPath" -ForegroundColor Green
