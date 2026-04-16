#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MAP_FILE="$SCRIPT_DIR/naming-map.json"

SKIP_VERIFY=false
DRY_RUN=false
SCOPE_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-verify) SKIP_VERIFY=true; shift ;;
    --dry-run)     DRY_RUN=true; shift ;;
    --scope)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --scope requires a directory argument"
        exit 1
      fi
      SCOPE_DIR="$(cd "$2" 2>/dev/null && pwd)" || { echo "ERROR: --scope directory does not exist: $2"; exit 1; }
      shift 2
      ;;
    --map)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --map requires a file argument"
        exit 1
      fi
      MAP_FILE="$(cd "$(dirname "$2")" 2>/dev/null && pwd)/$(basename "$2")" || { echo "ERROR: --map path is invalid: $2"; exit 1; }
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--dry-run] [--skip-verify] [--scope <dir>] [--map <file>]"
      echo "  --dry-run       Print what would be done without making changes"
      echo "  --skip-verify   Skip build and test verification after rename"
      echo "  --scope <dir>   Limit scan to a specific folder and its children"
      echo "                  (default: src/ + server/)"
      echo "  --map <file>    Path to a naming-map JSON file"
      echo "                  (default: tools/naming-map.json next to this script)"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ ! -f "$MAP_FILE" ]]; then
  echo "ERROR: naming-map file not found at $MAP_FILE"
  exit 1
fi

# Phase 0: Extract replacements from naming-map.json using Node.js
# Produces tab-separated lines: FROM\tTO, sorted longest-first
REPLACEMENTS=$(node -e "
  const fs = require('fs');
  const map = JSON.parse(fs.readFileSync('$MAP_FILE', 'utf8'));
  const pairs = [];

  for (const [category, entries] of Object.entries(map)) {
    if (category === 'meta') continue;
    if (typeof entries !== 'object') continue;
    for (const [from, to] of Object.entries(entries)) {
      if (to === '___' || to === from) continue;
      pairs.push([from, to]);
    }
  }

  // Sort longest-first to prevent partial matches
  pairs.sort((a, b) => b[0].length - a[0].length);
  pairs.forEach(([from, to]) => console.log(from + '\t' + to));
")

if [[ -z "$REPLACEMENTS" ]]; then
  echo "No replacements to apply (all targets are '___' or unchanged)."
  exit 0
fi

PAIR_COUNT=$(echo "$REPLACEMENTS" | wc -l | tr -d ' ')
echo "Found $PAIR_COUNT replacement(s) to apply."

if $DRY_RUN; then
  if [[ -n "$SCOPE_DIR" ]]; then
    echo ""
    echo "Scope: $SCOPE_DIR (recursive)"
  fi
  echo ""
  echo "=== DRY RUN — replacements that would be applied ==="
  echo "$REPLACEMENTS" | while IFS=$'\t' read -r from to; do
    echo "  '$from' -> '$to'"
  done
  echo ""
  echo "=== DRY RUN — no changes made ==="
  exit 0
fi

# Phase 1: Content replacement across all source files
echo ""
echo "=== Phase 1: Content replacement ==="

if [[ -n "$SCOPE_DIR" ]]; then
  TARGET_DIRS=("$SCOPE_DIR")
  echo "Scope: $SCOPE_DIR (recursive)"
else
  TARGET_DIRS=("$PROJECT_ROOT/src" "$PROJECT_ROOT/server")
fi
FILE_EXTENSIONS=("ts" "html" "scss" "json" "md")

build_find_args() {
  local dir="$1"
  local args=(-type f \()
  local first=true
  for ext in "${FILE_EXTENSIONS[@]}"; do
    if $first; then
      first=false
    else
      args+=(-o)
    fi
    args+=(-name "*.${ext}")
  done
  args+=(\))
  args+=(-not -path "*/node_modules/*" -not -path "*/dist/*")
  find "$dir" "${args[@]}" 2>/dev/null
}

ALL_FILES=""
for dir in "${TARGET_DIRS[@]}"; do
  if [[ -d "$dir" ]]; then
    ALL_FILES+="$(build_find_args "$dir")"$'\n'
  fi
done
if [[ -z "$SCOPE_DIR" ]]; then
  EXTRA_FILES=("$PROJECT_ROOT/proxy.conf.json")
  for f in "${EXTRA_FILES[@]}"; do
    if [[ -f "$f" ]]; then
      ALL_FILES+="$f"$'\n'
    fi
  done
fi
ALL_FILES=$(echo "$ALL_FILES" | grep -v '^$' | sort -u)

FILE_COUNT=$(echo "$ALL_FILES" | wc -l | tr -d ' ')
echo "Scanning $FILE_COUNT files..."

CONTENT_CHANGES=0
echo "$REPLACEMENTS" | while IFS=$'\t' read -r from to; do
  escaped_from=$(printf '%s' "$from" | sed 's/[.[\(*^$+?{|\\]/\\&/g; s/\//\\\//g')
  escaped_to=$(printf '%s' "$to" | sed 's/[&\\/]/\\&/g')

  echo "$ALL_FILES" | while read -r file; do
    if [[ -f "$file" ]] && grep -qF "$from" "$file" 2>/dev/null; then
      sed -i '' "s/${escaped_from}/${escaped_to}/g" "$file"
      echo "  Replaced '$from' -> '$to' in $(basename "$file")"
    fi
  done
done

echo "Content replacement complete."

# Phase 2: File and folder renaming
echo ""
echo "=== Phase 2: File and folder renaming ==="

FOLDER_RENAMES=$(node -e "
  const fs = require('fs');
  const map = JSON.parse(fs.readFileSync('$MAP_FILE', 'utf8'));
  const renames = [];

  if (map.folderNames) {
    for (const [from, to] of Object.entries(map.folderNames)) {
      if (to === '___' || to === from) continue;
      renames.push([from, to]);
    }
  }

  // Sort by depth (deepest first) then longest name first
  renames.sort((a, b) => b[0].length - a[0].length);
  renames.forEach(([from, to]) => console.log(from + '\t' + to));
")

if [[ -n "$FOLDER_RENAMES" ]]; then
  echo "$FOLDER_RENAMES" | while IFS=$'\t' read -r from to; do
    find "${TARGET_DIRS[@]}" -depth -name "*${from}*" \
      -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null | while read -r path; do
      dir=$(dirname "$path")
      base=$(basename "$path")
      new_base="${base//$from/$to}"
      if [[ "$base" != "$new_base" ]]; then
        mv "$path" "$dir/$new_base"
        echo "  Renamed: $base -> $new_base"
      fi
    done
  done
  echo "File/folder renaming complete."
else
  echo "No folder renames to apply."
fi

# Phase 2b: Fix import paths after folder renames
if [[ -n "$FOLDER_RENAMES" ]]; then
  echo ""
  echo "=== Phase 2b: Fixing import paths ==="
  echo "Import paths were already updated in Phase 1 (content replacement covers import strings)."
fi

# Phase 3: Verify
echo ""
if $SKIP_VERIFY; then
  echo "=== Phase 3: Verification SKIPPED (--skip-verify) ==="
else
  echo "=== Phase 3: Build verification ==="

  cd "$PROJECT_ROOT"

  echo "Running build..."
  if npm run build 2>&1; then
    echo "Build: PASSED"
  else
    echo "Build: FAILED"
    echo "Fix build errors and re-run, or use --skip-verify to skip."
    exit 1
  fi

  echo ""
  echo "Running tests..."
  if npx ng test --watch=false --browsers=ChromeHeadless 2>&1; then
    echo "Tests: PASSED"
  else
    echo "Tests: FAILED"
    echo "Fix test failures and re-run, or use --skip-verify to skip."
    exit 1
  fi
fi

echo ""
echo "=== Naming swap complete ==="
echo "Tip: Review changes with 'git diff', then commit:"
echo "  git add -A && git commit -m 'Applied naming swap'"
