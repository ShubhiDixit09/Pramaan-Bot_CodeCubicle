$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $PSScriptRoot
$PythonExe = Join-Path $ProjectDir ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $PythonExe)) {
  $PythonLauncher = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }
  if ($PythonLauncher -eq "py") {
    py -3 -m venv (Join-Path $ProjectDir ".venv")
  } else {
    python -m venv (Join-Path $ProjectDir ".venv")
  }
  if ($LASTEXITCODE -ne 0) { throw "Could not create the Python virtual environment." }
}

& $PythonExe -m pip install -r (Join-Path $ProjectDir "backend\requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Python dependency installation failed. Setup is incomplete." }

Push-Location (Join-Path $ProjectDir "frontend")
try {
  npm ci
  $NpmExitCode = $LASTEXITCODE
} finally {
  Pop-Location
}
if ($NpmExitCode -ne 0) {
  throw "Frontend dependency installation failed. Stop any running Vite server, then see the npm repair steps in README.md. Setup is incomplete."
}

Write-Host ""
Write-Host "Setup complete."
Write-Host "From the repository root, start these in separate PowerShell terminals:"
Write-Host "Backend:  .\.venv\Scripts\python.exe backend\run.py"
Write-Host "Frontend: Set-Location .\frontend; npm run dev"


