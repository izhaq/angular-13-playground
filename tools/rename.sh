#!/usr/bin/env bash
#
# Thin shim around tools/rename.js.
#
# Why a shim instead of a parallel implementation?
# The previous bash version was already ~90% inline `node -e "..."` snippets
# (Node is a hard prerequisite for this repo anyway). Maintaining the new
# ledger semantics in two languages — including per-file occurrence counts,
# which `sed -i` cannot capture reliably — is a maintenance trap and a
# constant source of forward/reverse drift.
#
# The single source of truth is tools/rename.js. This shim exists so that
# users with shell muscle memory can still type `tools/rename.sh ...` and get
# the exact same behaviour, flags, and exit codes.
#
# All flags are forwarded as-is. See: node tools/rename.js --help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: 'node' not found on PATH. tools/rename.sh requires Node.js." >&2
  exit 1
fi

exec node "$SCRIPT_DIR/rename.js" "$@"
