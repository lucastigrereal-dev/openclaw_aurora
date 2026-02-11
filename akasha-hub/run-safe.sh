#!/bin/bash
# Akasha Hub — Security Wrapper
# Executa scripts Python isolando apenas variaveis AKASHA_*
# Uso: ./run-safe.sh <script.py> [args...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <script.py> [args...]"
    echo "Example: $0 scripts/scanner/scan_drive.py --dry-run"
    exit 1
fi

SCRIPT="$1"
shift

# Resolve script path
if [[ ! "$SCRIPT" = /* ]]; then
    SCRIPT="$SCRIPT_DIR/$SCRIPT"
fi

if [ ! -f "$SCRIPT" ]; then
    echo "Error: Script not found: $SCRIPT"
    exit 1
fi

# Load .env if exists
if [ -f "$SCRIPT_DIR/../.env" ]; then
    set -a
    source "$SCRIPT_DIR/../.env"
    set +a
fi

# Execute with isolated environment
env -i \
    HOME="$HOME" \
    PATH="$PATH" \
    PYTHONPATH="${PYTHONPATH:-}" \
    AKASHA_SUPABASE_URL="${AKASHA_SUPABASE_URL:-}" \
    AKASHA_SUPABASE_KEY="${AKASHA_SUPABASE_KEY:-}" \
    OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
    GOOGLE_DRIVE_CREDENTIALS="${GOOGLE_DRIVE_CREDENTIALS:-}" \
    python3 "$SCRIPT" "$@"
