#!/usr/bin/env node

/**
 * E2E round-trip test for tools/rename.js.
 *
 * Builds an isolated sandbox (a temp dir mimicking the project layout the
 * script expects), runs a forward pass with a tiny map, snapshots state,
 * runs --reverse, and asserts the working tree is bit-for-bit identical to
 * the original snapshot. This is the test the user's "ran in both directions
 * and expected a clean diff" experiment was implicitly asking for.
 *
 * Usage: node tools/rename.test.js
 * Exit:  0 on success, 1 on any assertion failure.
 *
 * Deliberately framework-free (no Jest, no Karma) so it runs anywhere Node
 * does and stays trivially debuggable.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// The script under test derives PROJECT_ROOT from its own __dirname, so we
// MUST copy it into each sandbox before invoking. Running the original from
// /<repo>/tools/rename.js would walk the real /<repo>/src and write the real
// /<repo>/tools/.rename-state.json — disastrous.
const RENAME_JS_SOURCE = path.resolve(__dirname, 'rename.js');

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  FAIL  ${name}`);
    if (detail) console.log(`        ${detail}`);
  }
}

function hashTree(rootDir) {
  // Stable digest over (relative path, file contents) for every file under root,
  // ignoring node_modules / dist / .git / .cursor and the ledger artifacts so
  // we measure the source tree only.
  const hash = crypto.createHash('sha256');
  const ignoreNames = new Set(['node_modules', 'dist', '.git', '.cursor']);
  const ignoreFiles = new Set(['.rename-state.json']);

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      if (ignoreNames.has(entry.name)) continue;
      if (
        ignoreFiles.has(entry.name) ||
        entry.name.startsWith('.rename-state.json.undone-')
      ) {
        continue;
      }
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full);
      if (entry.isDirectory()) {
        hash.update(`D ${rel}\n`);
        walk(full);
      } else if (entry.isFile()) {
        const buf = fs.readFileSync(full);
        hash.update(`F ${rel} ${buf.length}\n`);
        hash.update(buf);
        hash.update('\n');
      }
    }
  };
  walk(rootDir);
  return hash.digest('hex');
}

function listFiles(rootDir) {
  const out = [];
  const ignoreNames = new Set(['node_modules', 'dist', '.git', '.cursor']);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoreNames.has(entry.name)) continue;
      // Ledger artifacts are intentionally created/archived by the script;
      // they're not part of the source tree we're comparing.
      if (
        entry.name === '.rename-state.json' ||
        entry.name.startsWith('.rename-state.json.undone-')
      ) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(path.relative(rootDir, full));
    }
  };
  walk(rootDir);
  return out.sort();
}

function makeSandbox() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-test-'));

  // tools/ holds the map AND a copy of rename.js (so that __dirname/PROJECT_ROOT
  // resolves to the sandbox, not the real repo).
  fs.mkdirSync(path.join(sandbox, 'tools'));
  fs.copyFileSync(RENAME_JS_SOURCE, path.join(sandbox, 'tools', 'rename.js'));

  // Source tree: a couple of files + a folder that needs renaming.
  fs.mkdirSync(path.join(sandbox, 'src', 'frequent-module'), { recursive: true });
  fs.writeFileSync(
    path.join(sandbox, 'src', 'frequent-module', 'index.ts'),
    [
      "import { primary } from './primary-thing';",
      '',
      'export const frequent = primary;',
      'export const FREQUENT_LABEL = "frequent";',
      '// Override Material defaults below',
      'console.log("frequent count:", primary);',
      '',
    ].join('\n'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(sandbox, 'src', 'styles.scss'),
    [
      '$dark-primary: #333;',
      '$primary-text: white;',
      '',
      '.button {',
      '  color: $primary-text;',
      '  background: $dark-primary;',
      '}',
      '',
    ].join('\n'),
    'utf8'
  );
  // Server dir is part of the script's default scan; create an empty one so
  // the script doesn't trip on missing paths.
  fs.mkdirSync(path.join(sandbox, 'server'));

  return sandbox;
}

function makeMap(sandbox, mapping) {
  const mapPath = path.join(sandbox, 'tools', 'naming-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(mapping, null, 2), 'utf8');
  return mapPath;
}

function runRename(sandbox, extraArgs) {
  const args = ['--skip-verify', ...extraArgs];
  execFileSync('node', [path.join(sandbox, 'tools', 'rename.js'), ...args], {
    cwd: sandbox,
    stdio: 'pipe',
  });
}

function safeRm(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

// --------------------------------------------------------------------------
// Test 1: round-trip on a codebase that DOES contain forward `from` strings.
//         Expectation: forward changes things, reverse exactly undoes them,
//         net diff = none.
// --------------------------------------------------------------------------
function test_roundTripUndoesEverything() {
  console.log('\nTEST 1: forward + reverse leaves no net diff (the round-trip case)');
  const sandbox = makeSandbox();
  try {
    const mapPath = makeMap(sandbox, {
      tokens: {
        frequent: 'rare',
        Override: 'Force',
      },
      folderNames: {
        'frequent-module': 'rare-module',
      },
    });

    const beforeHash = hashTree(sandbox);
    const beforeFiles = listFiles(sandbox);

    runRename(sandbox, ['--map', mapPath]);

    const afterForwardHash = hashTree(sandbox);
    const afterForwardFiles = listFiles(sandbox);

    assert(
      'forward actually modifies the tree',
      beforeHash !== afterForwardHash,
      `before=${beforeHash.slice(0, 8)} after=${afterForwardHash.slice(0, 8)}`
    );
    assert(
      'forward renames the folder',
      afterForwardFiles.some((f) => f.includes('rare-module')) &&
        !afterForwardFiles.some((f) => f.includes('frequent-module')),
      `files after forward: ${afterForwardFiles.join(', ')}`
    );
    assert(
      'forward writes the ledger',
      fs.existsSync(path.join(sandbox, 'tools', '.rename-state.json'))
    );

    runRename(sandbox, ['--reverse']);

    const afterReverseHash = hashTree(sandbox);
    const afterReverseFiles = listFiles(sandbox);

    assert(
      'reverse restores folder layout',
      JSON.stringify(afterReverseFiles) === JSON.stringify(beforeFiles),
      `expected=${beforeFiles.join(', ')}\n        actual=${afterReverseFiles.join(', ')}`
    );
    assert(
      'reverse restores file contents bit-for-bit',
      afterReverseHash === beforeHash,
      `before=${beforeHash}\n        after =${afterReverseHash}`
    );
    assert(
      'reverse archives the ledger (so a second --reverse is a no-op)',
      !fs.existsSync(path.join(sandbox, 'tools', '.rename-state.json')) &&
        fs.readdirSync(path.join(sandbox, 'tools')).some((n) =>
          n.startsWith('.rename-state.json.undone-')
        )
    );
  } finally {
    safeRm(sandbox);
  }
}

// --------------------------------------------------------------------------
// Test 2: --reverse on a codebase with no ledger should refuse loudly.
//         Crucially: it must NOT touch any files.
//         (This is the bug class the user actually hit.)
// --------------------------------------------------------------------------
function test_reverseWithoutLedgerRefuses() {
  console.log('\nTEST 2: --reverse with no ledger refuses without touching files');
  const sandbox = makeSandbox();
  try {
    const beforeHash = hashTree(sandbox);
    let exitCode = 0;
    try {
      execFileSync('node', [path.join(sandbox, 'tools', 'rename.js'), '--reverse', '--skip-verify'], {
        cwd: sandbox,
        stdio: 'pipe',
      });
    } catch (err) {
      exitCode = err.status;
    }
    assert('exits non-zero', exitCode !== 0, `exitCode=${exitCode}`);
    assert(
      'tree unchanged',
      hashTree(sandbox) === beforeHash,
      'reverse without a ledger MUST be a no-op on disk'
    );
  } finally {
    safeRm(sandbox);
  }
}

// --------------------------------------------------------------------------
// Test 3: forward run refuses when a ledger already exists (no --force).
//         This prevents silently destroying an undo target.
// --------------------------------------------------------------------------
function test_forwardRefusesWithExistingLedger() {
  console.log('\nTEST 3: second forward run refuses without --force');
  const sandbox = makeSandbox();
  try {
    const mapPath = makeMap(sandbox, {
      tokens: { frequent: 'rare' },
    });
    runRename(sandbox, ['--map', mapPath]);
    assert(
      'first forward writes the ledger',
      fs.existsSync(path.join(sandbox, 'tools', '.rename-state.json'))
    );

    const snapshot = hashTree(sandbox);
    let exitCode = 0;
    try {
      execFileSync('node', [path.join(sandbox, 'tools', 'rename.js'), '--map', mapPath, '--skip-verify'], {
        cwd: sandbox,
        stdio: 'pipe',
      });
    } catch (err) {
      exitCode = err.status;
    }
    assert('second forward (no --force) exits non-zero', exitCode !== 0);
    assert(
      'tree unchanged after refused forward',
      hashTree(sandbox) === snapshot
    );
  } finally {
    safeRm(sandbox);
  }
}

// --------------------------------------------------------------------------
// Test 4: --force allows overwriting an existing ledger.
//         This proves the escape hatch works (the only way to chain forwards).
// --------------------------------------------------------------------------
function test_forwardWithForceOverwritesLedger() {
  console.log('\nTEST 4: --force allows a second forward to overwrite the ledger');
  const sandbox = makeSandbox();
  try {
    const mapPath = makeMap(sandbox, { tokens: { frequent: 'rare' } });
    runRename(sandbox, ['--map', mapPath]);
    const ledgerBefore = fs.readFileSync(
      path.join(sandbox, 'tools', '.rename-state.json'),
      'utf8'
    );
    // Re-running with --force on a tree that no longer contains 'frequent'
    // produces an empty edit set but still writes a fresh ledger (different
    // createdAt timestamp).
    runRename(sandbox, ['--map', mapPath, '--force']);
    const ledgerAfter = fs.readFileSync(
      path.join(sandbox, 'tools', '.rename-state.json'),
      'utf8'
    );
    assert(
      'ledger replaced (createdAt differs)',
      ledgerBefore !== ledgerAfter,
      'createdAt should have updated; either content or timestamp must change'
    );
  } finally {
    safeRm(sandbox);
  }
}

// --------------------------------------------------------------------------
// Run.
// --------------------------------------------------------------------------
console.log(`Running tools/rename.js round-trip tests against: ${RENAME_JS_SOURCE}`);
console.log('(each test copies rename.js into an isolated tmp sandbox)');

test_roundTripUndoesEverything();
test_reverseWithoutLedgerRefuses();
test_forwardRefusesWithExistingLedger();
test_forwardWithForceOverwritesLedger();

console.log('');
console.log(`Result: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.name}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
  process.exit(1);
}
process.exit(0);
