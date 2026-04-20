#!/usr/bin/env node

/**
 * Cross-platform naming swap script (Windows / macOS / Linux).
 * Reads naming-map.json and applies bulk find-and-replace across the project.
 *
 * Forward runs WRITE a ledger to tools/.rename-state.json containing:
 *   - a full snapshot of every file's ORIGINAL content (taken before the
 *     first edit to that file), and
 *   - every {from, to} folder rename actually performed.
 *
 * `--reverse` IGNORES the map and rebuilds the original tree from the ledger:
 *   - undoes folder renames in reverse order, then
 *   - writes each snapshot back over the current file content.
 *
 * Why snapshots and not (from, to, count) edit records:
 *   Counted regex replay is ambiguous when the forward `to` value already
 *   existed in the source. E.g. forward `frequent -> rare` on a file
 *   containing both 'tab.frequent' and 'tab.rare' produces two 'tab.rare'
 *   keys; reverse can't tell which 'rare' was "ours" and would corrupt the
 *   originally-rare key. Full snapshots sidestep the entire class of
 *   collisions.
 *
 * Usage:
 *   node tools/rename.js [--dry-run] [--skip-verify] [--reverse] [--force]
 *                        [--scope <dir>] [--map <file>]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const LEDGER_PATH = path.join(SCRIPT_DIR, '.rename-state.json');

const FILE_EXTENSIONS = new Set(['.ts', '.html', '.scss', '.json', '.md']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cursor']);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_VERIFY = args.includes('--skip-verify');
const REVERSE = args.includes('--reverse');
const FORCE = args.includes('--force');

const scopeIndex = args.indexOf('--scope');
const SCOPE_DIR = scopeIndex !== -1 && args[scopeIndex + 1]
  ? path.resolve(args[scopeIndex + 1])
  : null;

const mapIndex = args.indexOf('--map');
const MAP_FILE = mapIndex !== -1 && args[mapIndex + 1]
  ? path.resolve(args[mapIndex + 1])
  : path.join(SCRIPT_DIR, 'naming-map.json');

if (args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (REVERSE) {
  runReverse();
  process.exit(0);
}

runForward();

// ============================================================
// Help
// ============================================================
function printHelp() {
  console.log('Usage: node tools/rename.js [--dry-run] [--skip-verify] [--reverse] [--force]');
  console.log('                            [--scope <dir>] [--map <file>]');
  console.log('');
  console.log('  --dry-run       Print what would be done without making changes.');
  console.log('  --skip-verify   Skip build and test verification after the rename.');
  console.log('  --reverse       True undo: replay the inverse of the most recent forward');
  console.log('                  run from tools/.rename-state.json. The map is IGNORED in');
  console.log('                  this mode. Refuses if no ledger exists.');
  console.log('  --force         Allow a forward run to overwrite an existing ledger');
  console.log('                  (i.e. give up the ability to undo the prior forward run).');
  console.log('  --scope <dir>   Limit the forward scan to a specific directory tree.');
  console.log('                  Ignored under --reverse (the ledger has its own paths).');
  console.log('  --map <file>    Path to a naming-map JSON. Ignored under --reverse.');
  console.log('                  Default: tools/naming-map.json');
  console.log('');
  console.log('Ledger:    tools/.rename-state.json (gitignored).');
  console.log('On undo:   ledger is archived to tools/.rename-state.json.undone-<timestamp>');
  console.log('           so a second --reverse correctly says "nothing to undo".');
  console.log('');
  console.log('Idempotency guarantee:');
  console.log('  forward (writes ledger) + reverse (replays ledger inverse) = no-op.');
  console.log('  This was NOT true for the previous map-based --reverse, which would edit');
  console.log('  any string matching the inverted map regardless of whether forward had');
  console.log('  actually written it.');
}

// ============================================================
// Reverse (undo) — reads the ledger, ignores the map.
// ============================================================
function runReverse() {
  if (!fs.existsSync(LEDGER_PATH)) {
    console.error(`ERROR: nothing to undo — no ledger at ${LEDGER_PATH}`);
    console.error('Run a forward pass first, then re-run with --reverse.');
    process.exit(1);
  }

  let ledger;
  try {
    ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
  } catch (err) {
    console.error(`ERROR: ledger at ${LEDGER_PATH} is unreadable: ${err.message}`);
    process.exit(1);
  }

  const folderRenames = Array.isArray(ledger.phase2FolderRenames) ? ledger.phase2FolderRenames : [];
  const fileSnapshots = Array.isArray(ledger.fileSnapshots) ? ledger.fileSnapshots : [];

  console.log('REVERSE MODE: rebuilding the pre-forward tree from the ledger.');
  console.log(`  Ledger:           ${LEDGER_PATH}`);
  console.log(`  Created:          ${ledger.createdAt || '(unknown)'}`);
  console.log(`  Map used:         ${ledger.mapPath || '(unknown)'}`);
  console.log(`  Folder undos:     ${folderRenames.length}`);
  console.log(`  File restorations: ${fileSnapshots.length}`);

  if (DRY_RUN) {
    console.log('\n=== DRY RUN — undo plan ===');
    console.log('Folder renames to revert (deepest first):');
    [...folderRenames].reverse().forEach(({ from, to }) => {
      console.log(`  ${to}  ->  ${from}`);
    });
    console.log('Files to restore from snapshot:');
    fileSnapshots.forEach(({ file }) => {
      console.log(`  ${file}`);
    });
    console.log('=== DRY RUN — no changes made ===');
    return;
  }

  // Phase A: undo folder renames first so the snapshot paths (which were
  // captured BEFORE the forward folder rename) resolve to the right locations.
  // Reverse iteration order so deeper / later renames are undone before their
  // parents.
  console.log('\n=== Reverse Phase A: Folder rename undo ===');
  let folderUndone = 0;
  for (const { from, to } of [...folderRenames].reverse()) {
    const fromAbs = resolveLedgerPath(from);
    const toAbs = resolveLedgerPath(to);
    if (!fs.existsSync(toAbs)) {
      console.warn(`  SKIP: ${to} no longer exists (already undone or moved).`);
      continue;
    }
    if (fs.existsSync(fromAbs)) {
      console.warn(`  SKIP: ${from} already exists; cannot rename ${to} back over it.`);
      continue;
    }
    try {
      fs.renameSync(toAbs, fromAbs);
      console.log(`  Reverted: ${to} -> ${from}`);
      folderUndone++;
    } catch (err) {
      console.error(`  FAILED: ${to} -> ${from}: ${err.message}`);
    }
  }
  console.log(`Folder rename undo: ${folderUndone}/${folderRenames.length} reverted.`);

  // Phase B: restore file contents from the snapshot. Bit-for-bit overwrite,
  // so any forward edit (regardless of how many regex passes touched the file)
  // is reverted in a single atomic write per file.
  console.log('\n=== Reverse Phase B: File content restoration ===');
  let restored = 0;
  for (const { file, originalContent } of fileSnapshots) {
    const fileAbs = resolveLedgerPath(file);
    try {
      // mkdir -p in case the file lived under a folder we just recreated by
      // undoing a Phase 2 rename and the parent doesn't exist for some reason.
      fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
      fs.writeFileSync(fileAbs, originalContent, 'utf8');
      console.log(`  Restored: ${file}`);
      restored++;
    } catch (err) {
      console.error(`  FAILED: ${file}: ${err.message}`);
    }
  }
  console.log(`File restoration: ${restored}/${fileSnapshots.length} restored.`);

  // Archive the ledger so a second --reverse correctly says "nothing to undo".
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = `${LEDGER_PATH}.undone-${stamp}`;
  fs.renameSync(LEDGER_PATH, archivePath);
  console.log(`\nLedger archived to: ${archivePath}`);
  console.log('=== Undo complete ===');
}

// ============================================================
// Forward (apply) — reads the map, writes the ledger.
// ============================================================
function runForward() {
  if (SCOPE_DIR && !fs.existsSync(SCOPE_DIR)) {
    console.error(`ERROR: --scope directory does not exist: ${SCOPE_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(MAP_FILE)) {
    console.error(`ERROR: naming-map file not found at ${MAP_FILE}`);
    process.exit(1);
  }
  if (!DRY_RUN && fs.existsSync(LEDGER_PATH) && !FORCE) {
    console.error(`ERROR: an existing ledger is at ${LEDGER_PATH}.`);
    console.error('A previous forward run has not been undone. Either:');
    console.error('  - Run with --reverse to undo it first, or');
    console.error('  - Re-run with --force to overwrite the ledger (the prior change becomes un-undoable).');
    process.exit(1);
  }

  // --- Phase 0: Parse naming-map.json ---
  const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  const pairs = [];
  for (const [category, entries] of Object.entries(map)) {
    if (category === 'meta') continue;
    if (typeof entries !== 'object' || entries === null) continue;
    for (const [from, to] of Object.entries(entries)) {
      if (to === '___' || to === from) continue;
      pairs.push({ from, to, category });
    }
  }
  pairs.sort((a, b) => b.from.length - a.from.length);

  if (pairs.length === 0) {
    console.log('No replacements to apply (all targets are "___" or unchanged).');
    process.exit(0);
  }
  console.log(`Found ${pairs.length} replacement(s) to apply.`);

  if (DRY_RUN) {
    if (SCOPE_DIR) console.log(`\nScope: ${SCOPE_DIR} (recursive)`);
    console.log('\n=== DRY RUN — replacements that would be applied ===');
    for (const { from, to, category } of pairs) {
      console.log(`  [${category}] '${from}' -> '${to}'`);
    }
    console.log('\n=== DRY RUN — no changes made ===');
    process.exit(0);
  }

  const ledger = {
    createdAt: new Date().toISOString(),
    mapPath: path.relative(PROJECT_ROOT, MAP_FILE),
    scopeDir: SCOPE_DIR ? path.relative(PROJECT_ROOT, SCOPE_DIR) : null,
    fileSnapshots: [],
    phase2FolderRenames: [],
  };

  // Per-file map of relPath -> originalContent for files we've already
  // snapshotted. We snapshot once, on first edit, so multi-pair forward
  // sweeps still leave a single restorable image per file.
  const snapshotIndex = new Map();

  // --- Phase 1: Content replacement ---
  console.log('\n=== Phase 1: Content replacement ===');
  const targetDirs = SCOPE_DIR
    ? [SCOPE_DIR]
    : [path.join(PROJECT_ROOT, 'src'), path.join(PROJECT_ROOT, 'server')];
  if (SCOPE_DIR) console.log(`Scope: ${SCOPE_DIR} (recursive)`);

  let allFiles = [];
  for (const dir of targetDirs) {
    allFiles.push(...walkFiles(dir));
  }
  if (!SCOPE_DIR) {
    const proxyConf = path.join(PROJECT_ROOT, 'proxy.conf.json');
    if (fs.existsSync(proxyConf)) allFiles.push(proxyConf);
  }
  allFiles = [...new Set(allFiles)];
  console.log(`Scanning ${allFiles.length} files...`);

  let totalReplacements = 0;
  for (const { from, to } of pairs) {
    const escaped = escapeRegex(from);
    const pattern = needsBoundary(from) ? `\\b${escaped}\\b` : escaped;
    const regex = new RegExp(pattern, 'g');

    for (const filePath of allFiles) {
      let content;
      try { content = fs.readFileSync(filePath, 'utf8'); } catch { continue; }
      if (!content.includes(from)) continue;
      const newContent = content.replace(regex, to);
      if (newContent === content) continue;

      const relPath = path.relative(PROJECT_ROOT, filePath);
      // Snapshot original content the first time we touch this file. Later
      // pairs in this sweep may edit the same file; we want the pre-FORWARD
      // image, not the post-first-edit image.
      if (!snapshotIndex.has(relPath)) {
        snapshotIndex.set(relPath, content);
        ledger.fileSnapshots.push({ file: relPath, originalContent: content });
      }

      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  Replaced '${from}' -> '${to}' in ${path.basename(filePath)}`);
      totalReplacements++;
    }
  }
  console.log(
    `Content replacement complete (${totalReplacements} file edits across ${snapshotIndex.size} files).`
  );

  // --- Phase 2: File and folder renaming ---
  console.log('\n=== Phase 2: File and folder renaming ===');
  const folderRenames = [];
  if (map.folderNames) {
    for (const [from, to] of Object.entries(map.folderNames)) {
      if (to === '___' || to === from) continue;
      folderRenames.push({ from, to });
    }
  }
  folderRenames.sort((a, b) => b.from.length - a.from.length);

  if (folderRenames.length > 0) {
    for (const { from, to } of folderRenames) {
      const renameDirs = SCOPE_DIR ? [SCOPE_DIR] : targetDirs;
      const allPaths = [];
      for (const dir of renameDirs) allPaths.push(...walkAllPaths(dir));
      allPaths.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

      for (const itemPath of allPaths) {
        const baseName = path.basename(itemPath);
        if (!baseName.includes(from)) continue;
        const newBase = baseName.split(from).join(to);
        const newPath = path.join(path.dirname(itemPath), newBase);
        if (itemPath !== newPath && fs.existsSync(itemPath)) {
          try {
            fs.renameSync(itemPath, newPath);
          } catch (err) {
            if (err.code === 'ENOTEMPTY' && fs.statSync(itemPath).isDirectory()) {
              moveContents(itemPath, newPath);
              fs.rmdirSync(itemPath);
            } else {
              throw err;
            }
          }
          console.log(`  Renamed: ${baseName} -> ${newBase}`);
          ledger.phase2FolderRenames.push({
            from: path.relative(PROJECT_ROOT, itemPath),
            to: path.relative(PROJECT_ROOT, newPath),
          });
        }
      }
    }
    console.log('File/folder renaming complete.');
  } else {
    console.log('No folder renames to apply.');
  }

  console.log('\n=== Phase 2b: Import paths ===');
  console.log('Import paths were already updated in Phase 1.');

  // Persist the ledger BEFORE Phase 3 so the user can undo even if build/tests fail.
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  console.log(`\nLedger written: ${LEDGER_PATH}`);
  console.log('  Run "node tools/rename.js --reverse" to undo this change.');

  // --- Phase 3: Verify ---
  console.log('');
  if (SKIP_VERIFY) {
    console.log('=== Phase 3: Verification SKIPPED (--skip-verify) ===');
  } else {
    console.log('=== Phase 3: Build verification ===');
    try {
      console.log('Running build...');
      execSync('npm run build', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      console.log('Build: PASSED');
    } catch {
      console.error('Build: FAILED');
      console.error('Fix build errors and re-run, or use --skip-verify to skip.');
      console.error(`Tip: undo this run with "node tools/rename.js --reverse" (ledger: ${LEDGER_PATH}).`);
      process.exit(1);
    }
    try {
      console.log('\nRunning tests...');
      execSync('npx ng test --watch=false --browsers=ChromeHeadless', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });
      console.log('Tests: PASSED');
    } catch {
      console.error('Tests: FAILED');
      console.error('Fix test failures and re-run, or use --skip-verify to skip.');
      console.error(`Tip: undo this run with "node tools/rename.js --reverse" (ledger: ${LEDGER_PATH}).`);
      process.exit(1);
    }
  }

  console.log('\n=== Naming swap complete ===');
  console.log(`Ledger: ${LEDGER_PATH}`);
  console.log('Tip: Review changes with "git diff", then commit:');
  console.log('  git add -A && git commit -m "Applied naming swap"');
}

// ============================================================
// Helpers
// ============================================================
function walkFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile() && FILE_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function walkAllPaths(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkAllPaths(fullPath));
      results.push(fullPath);
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function needsBoundary(str) {
  return /^[a-zA-Z0-9_]+$/.test(str);
}

function moveContents(srcDir, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory() && fs.existsSync(destPath)) {
      moveContents(srcPath, destPath);
      fs.rmdirSync(srcPath);
    } else {
      fs.renameSync(srcPath, destPath);
    }
  }
}

function resolveLedgerPath(p) {
  return path.isAbsolute(p) ? p : path.join(PROJECT_ROOT, p);
}
