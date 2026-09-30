#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -x "$PROJECT_DIR/.venv/bin/pytest" ]]; then
  (cd "$PROJECT_DIR/backend" && "$PROJECT_DIR/.venv/bin/pytest" -q)
else
  echo "Python test dependencies are not installed. Run ./scripts/dev.sh once."
  exit 1
fi

npm --prefix "$PROJECT_DIR/frontend" run build


