$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$ProjectDir\.venv")) {
  python -m venv "$ProjectDir\.venv"
}

& "$ProjectDir\.venv\Scripts\python.exe" -m pip install -r "$ProjectDir\backend\requirements.txt"
npm --prefix "$ProjectDir\frontend" install

Write-Host ""
Write-Host "Setup complete."
Write-Host "Backend:  .\.venv\Scripts\python.exe backend\run.py"
Write-Host "Frontend: npm --prefix frontend run dev"


