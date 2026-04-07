#!/usr/bin/env bash
# Scans a directory tree and reports which subdirectories have/lack AGENTS.md files.
# Usage: bash scan-agents-md.sh <target-dir> [--min-files N]
#
# Output format (per subdirectory):
#   HAS     <path>
#   MISSING <path> (N files)
#     - file1.ts
#     - file2.ts
#   SKIP    <path> (N files)
#
# Options:
#   --min-files N   Minimum non-test .ts files for a dir to be reportable (default: 2)

set -euo pipefail

TARGET="${1:?Usage: scan-agents-md.sh <target-dir> [--min-files N]}"
MIN_FILES=2

shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --min-files) MIN_FILES="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -d "$TARGET" ]]; then
  echo "Error: '$TARGET' is not a directory" >&2
  exit 1
fi

TARGET=$(cd "$TARGET" && pwd)
REPO_ROOT=$(git -C "$TARGET" rev-parse --show-toplevel 2>/dev/null || echo "$TARGET")

rel_path() {
  local abs="$1"
  echo "${abs#"$REPO_ROOT"/}"
}

echo "=== AGENTS.md Scan: $(rel_path "$TARGET") ==="
echo "Min files threshold: $MIN_FILES"
echo ""

has_count=0
missing_count=0
skip_count=0

while IFS= read -r -d '' dir; do
  [[ "$dir" == "$TARGET" ]] && continue

  # Skip hidden directories, node_modules, dist, coverage
  case "$dir" in
    */node_modules/*|*/dist/*|*/coverage/*|*/.*) continue ;;
  esac

  rel=$(rel_path "$dir")

  # Collect non-test, non-spec .ts files (substance indicator)
  ts_files=()
  while IFS= read -r -d '' f; do
    ts_files+=("$(basename "$f")")
  done < <(find "$dir" -maxdepth 1 -name '*.ts' \
    ! -name '*.spec.ts' ! -name '*.test.ts' ! -name 'test.ts' \
    ! -name 'index.ts' ! -name 'public-api.ts' \
    -print0 2>/dev/null | sort -z)
  ts_count=${#ts_files[@]}

  if [[ -f "$dir/AGENTS.md" ]]; then
    echo "HAS     $rel"
    ((has_count++))
  elif [[ "$ts_count" -ge "$MIN_FILES" ]]; then
    echo "MISSING $rel ($ts_count files)"
    for f in "${ts_files[@]}"; do
      echo "  - $f"
    done
    ((missing_count++))
  else
    echo "SKIP    $rel ($ts_count files)"
    ((skip_count++))
  fi
done < <(find "$TARGET" -type d -print0 | sort -z)

echo ""
echo "--- Summary ---"
echo "HAS:     $has_count"
echo "MISSING: $missing_count"
echo "SKIP:    $skip_count"
