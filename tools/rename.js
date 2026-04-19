#!/usr/bin/env node

/**
 * Cross-platform naming swap script (Windows / macOS / Linux).
 * Reads naming-map.json and applies bulk find-and-replace across the project.
 *
 * Usage:
 *   node tools/rename.js [--dry-run] [--skip-verify] [--scope <dir>] [--map <file>]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRIPT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

const FILE_EXTENSIONS = new Set(['.ts', '.html', '.scss', '.json', '.md']);
const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', '.cursor']);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_VERIFY = args.includes('--skip-verify');

const scopeIndex = args.indexOf('--scope');
const SCOPE_DIR = scopeIndex !== -1 && args[scopeIndex + 1]
  ? path.resolve(args[scopeIndex + 1])
  : null;

const mapIndex = args.indexOf('--map');
const MAP_FILE = mapIndex !== -1 && args[mapIndex + 1]
  ? path.resolve(args[mapIndex + 1])
  : path.join(SCRIPT_DIR, 'naming-map.json');

if (args.includes('--help')) {
  console.log('Usage: node tools/rename.js [--dry-run] [--skip-verify] [--scope <dir>] [--map <file>]');
  console.log('  --dry-run       Print what would be done without making changes');
  console.log('  --skip-verify   Skip build and test verification after rename');
  console.log('  --scope <dir>   Limit scan to a specific folder and its children');
  console.log('                  (default: src/ + server/)');
  console.log('  --map <file>    Path to a naming-map JSON file');
  console.log('                  (default: tools/naming-map.json next to this script)');
  process.exit(0);
}

if (SCOPE_DIR && !fs.existsSync(SCOPE_DIR)) {
  console.error(`ERROR: --scope directory does not exist: ${SCOPE_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(MAP_FILE)) {
  console.error(`ERROR: naming-map file not found at ${MAP_FILE}`);
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
  if (SCOPE_DIR) {
    console.log(`\nScope: ${SCOPE_DIR} (recursive)`);
  }
  console.log('\n=== DRY RUN — replacements that would be applied ===');
  for (const { from, to, category } of pairs) {
    console.log(`  [${category}] '${from}' -> '${to}'`);
  }
  console.log('\n=== DRY RUN — no changes made ===');
  process.exit(0);
}

// --- Helpers ---

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

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// --- Phase 1: Content replacement ---

console.log('\n=== Phase 1: Content replacement ===');

const targetDirs = SCOPE_DIR
  ? [SCOPE_DIR]
  : [path.join(PROJECT_ROOT, 'src'), path.join(PROJECT_ROOT, 'server')];

if (SCOPE_DIR) {
  console.log(`Scope: ${SCOPE_DIR} (recursive)`);
}

let allFiles = [];
for (const dir of targetDirs) {
  allFiles.push(...walkFiles(dir));
}

if (!SCOPE_DIR) {
  const proxyConf = path.join(PROJECT_ROOT, 'proxy.conf.json');
  if (fs.existsSync(proxyConf)) {
    allFiles.push(proxyConf);
  }
}

allFiles = [...new Set(allFiles)];
console.log(`Scanning ${allFiles.length} files...`);

function needsBoundary(str) {
  return /^[a-zA-Z0-9_]+$/.test(str);
}

let totalReplacements = 0;
for (const { from, to } of pairs) {
  const escaped = escapeRegex(from);
  const pattern = needsBoundary(from) ? `\\b${escaped}\\b` : escaped;
  const regex = new RegExp(pattern, 'g');

  for (const filePath of allFiles) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    if (!content.includes(from)) continue;

    const newContent = content.replace(regex, to);
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`  Replaced '${from}' -> '${to}' in ${path.basename(filePath)}`);
      totalReplacements++;
    }
  }
}

console.log(`Content replacement complete (${totalReplacements} file edits).`);

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

function moveContents(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
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

if (folderRenames.length > 0) {
  for (const { from, to } of folderRenames) {
    const renameDirs = SCOPE_DIR ? [SCOPE_DIR] : targetDirs;
    const allPaths = [];
    for (const dir of renameDirs) {
      allPaths.push(...walkAllPaths(dir));
    }

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
      }
    }
  }
  console.log('File/folder renaming complete.');
} else {
  console.log('No folder renames to apply.');
}

console.log('\n=== Phase 2b: Import paths ===');
console.log('Import paths were already updated in Phase 1 (content replacement covers import strings).');

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
    process.exit(1);
  }
}

console.log('\n=== Naming swap complete ===');
console.log('Tip: Review changes with "git diff", then commit:');
console.log('  git add -A && git commit -m "Applied naming swap"');
