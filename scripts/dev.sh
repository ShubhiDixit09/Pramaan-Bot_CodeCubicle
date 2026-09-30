#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d "$PROJECT_DIR/.venv" ]]; then
  python3 -m venv "$PROJECT_DIR/.venv"
fi

"$PROJECT_DIR/.venv/bin/python" -m pip install -r "$PROJECT_DIR/backend/requirements.txt"

if [[ ! -d "$PROJECT_DIR/frontend/node_modules" ]]; then
  npm --prefix "$PROJECT_DIR/frontend" install
fi

"$PROJECT_DIR/.venv/bin/python" "$PROJECT_DIR/backend/run.py" &
API_PID=$!
trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM

npm --prefix "$PROJECT_DIR/frontend" run dev


