#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Debug-capture layer checker.
 *
 * Enforces the import rules in `specs/4-debug-capture/plan.md` → "Import
 * rules". The capture layer is only portable (copy `src/debug-capture/` into
 * any project) and only auditable (one place touches globals) while every
 * layer reaches the rest of the code through exactly one barrel. A deep import
 * compiles fine, so nothing but this script would notice one.
 *
 *   L1 contract   src/debug-capture/contract/      imports nothing
 *   L2 core       src/debug-capture/core/          → contract barrel
 *   L3 adapters   src/debug-capture/adapters/**    → core barrel
 *   L4 install    src/debug-capture/install/       → adapters barrel
 *   L5 public     src/debug-capture/*.ts           → install barrel
 *   L6 angular    src/app/features/debug-capture/  → src/debug-capture + @angular/*, rxjs
 *   L6 react      src/debug-capture/react/         → src/debug-capture (no packages, not even React)
 *   consumers     everything else in src/          → only the L5 or an L6 barrel
 *
 * The two L6 seams are siblings: neither may import the other, and the L5
 * barrel re-exports neither (L5 may not import a layer below).
 *
 * Inside L1–L6 a path import is allowed only when it is (a) in the importing
 * file's own directory, (b) from an `index.ts`, the `index.ts` of an immediate
 * child directory of the same layer, or (c) the barrel of the layer directly
 * above.
 *
 * Usage:
 *   node scripts/check-debug-capture-layers.js              # check src/
 *   node scripts/check-debug-capture-layers.js --self-test  # run the rule table
 *   npm run lint:layers
 *
 * Notes:
 *   - Specifiers come from `ts.preProcessFile`, so `import type`, `export …
 *     from` and dynamic `import()` all count, and imports inside comments or
 *     strings do not.
 *   - Non-relative specifiers that resolve against the repo root (tsconfig
 *     `baseUrl: './'`, e.g. `src/debug-capture/core`) are treated as path
 *     imports — otherwise they would be a quiet way around every rule.
 *   - `checkImport` is pure: file existence is injected, so `--self-test`
 *     never touches the file system.
 *   - Exit code 1 on any violation, 0 on a clean run.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

const CAPTURE_ROOT = 'src/debug-capture';
const ANGULAR_ROOT = 'src/app/features/debug-capture';

/** Ordered top-down; `above` is the only other layer a layer may import. */
const LAYERS = {
  contract: { id: 'L1', barrel: `${CAPTURE_ROOT}/contract/index.ts`, above: null },
  core: { id: 'L2', barrel: `${CAPTURE_ROOT}/core/index.ts`, above: 'contract' },
  adapters: { id: 'L3', barrel: `${CAPTURE_ROOT}/adapters/index.ts`, above: 'core' },
  install: { id: 'L4', barrel: `${CAPTURE_ROOT}/install/index.ts`, above: 'adapters' },
  public: { id: 'L5', barrel: `${CAPTURE_ROOT}/index.ts`, above: 'install' },
  angular: { id: 'L6', barrel: `${ANGULAR_ROOT}/index.ts`, above: 'public' },
  // Inside src/debug-capture/ so copying that folder into a React app brings it along.
  react: { id: 'L6', barrel: `${CAPTURE_ROOT}/react/index.ts`, above: 'public' },
};

/** What a consumer may import (rule 7). */
const CONSUMER_BARRELS = [LAYERS.public.barrel, LAYERS.angular.barrel, LAYERS.react.barrel];

/** Packages L6 may import (rule 6). Everything below L6 imports none (rule 5). */
const ANGULAR_PACKAGES = [/^@angular\//, /^rxjs$/, /^rxjs\//];

const UNCLASSIFIED = 'unclassified';

/** Repo-relative POSIX path → layer key, `'consumer'`, or `UNCLASSIFIED`. */
function classify(file) {
  if (isInside(file, ANGULAR_ROOT)) return 'angular';
  if (!isInside(file, CAPTURE_ROOT)) return 'consumer';
  const rest = file.slice(CAPTURE_ROOT.length + 1);
  if (!rest.includes('/')) return 'public';
  const top = rest.split('/')[0];
  return top === 'contract' || top === 'core' || top === 'adapters' || top === 'install' || top === 'react'
    ? top
    : UNCLASSIFIED;
}

function isInside(file, dir) {
  return file.startsWith(`${dir}/`);
}

// ---------------------------------------------------------------------------
// The rule
// ---------------------------------------------------------------------------

/**
 * Checks one import. `from` is the importing file and `exists(p)` reports
 * whether a repo-relative file exists. Returns `null` when the import is
 * allowed, otherwise a one-line reason ending with the rule it breaks.
 */
function checkImport(from, specifier, exists) {
  const layer = classify(from);
  if (layer === UNCLASSIFIED) {
    return `fits no layer — files under ${CAPTURE_ROOT}/ belong in contract/, core/, adapters/, install/, react/ or directly in it`;
  }

  const target = resolveSpecifier(from, specifier, exists);

  if (layer === 'consumer') {
    if (target === null) return null; // a package, or a path outside the capture layers
    const reachesIn = isInside(target, CAPTURE_ROOT) || isInside(target, ANGULAR_ROOT);
    return reachesIn && !CONSUMER_BARRELS.includes(target)
      ? `outside the debug-capture layers only ${CONSUMER_BARRELS.map((b) => path.posix.dirname(b)).join(', ')} may be imported (rule 7)`
      : null;
  }

  const { id, above } = LAYERS[layer];

  if (target === null) {
    if (isRelative(specifier)) return `cannot be resolved to a .ts file, so it cannot be checked (rule 4)`;
    if (layer === 'angular') {
      return ANGULAR_PACKAGES.some((re) => re.test(specifier))
        ? null
        : `L6 may import only @angular/*, rxjs and rxjs/* packages (rule 6)`;
    }
    return `${CAPTURE_ROOT} has zero package imports (rule 5)`;
  }

  const fromDir = path.posix.dirname(from);
  const targetDir = path.posix.dirname(target);

  if (targetDir === fromDir) return null; // (a) own directory
  // (b) child barrel — of the same layer only: the L5 barrel's children are
  // other layers, and reaching ./core from there would skip install.
  if (isIndex(from) && isIndex(target) && path.posix.dirname(targetDir) === fromDir && classify(target) === layer) {
    return null;
  }
  if (above !== null && target === LAYERS[above].barrel) return null; // (c) layer above

  if (above !== null && isInside(target, path.posix.dirname(LAYERS[above].barrel)) && classify(target) === above) {
    return `${id} may only import the ${above} barrel (rule 3)`;
  }
  if (isInside(target, fromDir) && classify(target) === layer) {
    return `only an index.ts may import a child directory, and only that child's index.ts (rule 2)`;
  }
  return above === null
    ? `${id} may only import files in its own directory (rule 4)`
    : `${id} may only import its own directory, a child barrel or the ${above} barrel (rule 4)`;
}

/**
 * Resolves the way the app's tsconfig does: relative to the importing file,
 * or to the repo root (`baseUrl: './'`), trying `<p>.ts` then `<p>/index.ts`.
 * Returns `null` for a package. A relative specifier that matches no file
 * also yields `null`; `checkImport` tells the two apart.
 */
function resolveSpecifier(from, specifier, exists) {
  const base = isRelative(specifier)
    ? path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
    : path.posix.normalize(specifier);
  const candidates = [`${base}.ts`, `${base}/index.ts`];
  if (base.endsWith('.ts')) candidates.unshift(base);
  return candidates.find((c) => !c.startsWith('../') && exists(c)) ?? null;
}

function isRelative(specifier) {
  return specifier === '.' || specifier === '..' || specifier.startsWith('./') || specifier.startsWith('../');
}

function isIndex(file) {
  return path.posix.basename(file) === 'index.ts';
}

/** Every module specifier in a file: imports, `export … from`, `import()`, `require`. */
function extractSpecifiers(text) {
  return ts.preProcessFile(text, true, true).importedFiles.map((f) => f.fileName);
}

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const files = walk(path.join(repoRoot, 'src')).map((abs) => toPosix(path.relative(repoRoot, abs)));
  const fileSet = new Set(files);
  const exists = (p) => fileSet.has(p);

  const violations = [];
  for (const layer of Object.values(LAYERS)) {
    if (!exists(layer.barrel)) violations.push(`${layer.barrel}: missing — the ${layer.id} layer barrel must exist`);
  }
  for (const file of files) {
    if (classify(file) === UNCLASSIFIED) {
      violations.push(`${file}: ${checkImport(file, '.', exists)}`);
      continue;
    }
    const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    for (const specifier of extractSpecifiers(text)) {
      const reason = checkImport(file, specifier, exists);
      if (reason !== null) violations.push(`${file}: imports '${specifier}' — ${reason}`);
    }
  }

  if (violations.length > 0) {
    violations.forEach((v) => console.error(v));
    console.error(`\n${violations.length} debug-capture layer violation${violations.length === 1 ? '' : 's'}.`);
    process.exit(1);
  }
  console.log(`ok — debug-capture layer rules hold across ${files.length} files in src/`);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else if (entry.isFile() && entry.name.endsWith('.ts')) out.push(abs);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

// ---------------------------------------------------------------------------
// Self-test (no file system)
// ---------------------------------------------------------------------------

const VIRTUAL_FILES = new Set([
  'src/main.ts',
  'src/app/app.module.ts',
  'src/debug-capture/index.ts',
  'src/debug-capture/contract/index.ts',
  'src/debug-capture/contract/capture-contract.ts',
  'src/debug-capture/core/index.ts',
  'src/debug-capture/core/recorder.ts',
  'src/debug-capture/adapters/index.ts',
  'src/debug-capture/adapters/probes/index.ts',
  'src/debug-capture/adapters/probes/http/index.ts',
  'src/debug-capture/adapters/probes/http/xhr.probe.ts',
  'src/debug-capture/adapters/probes/http/headers.ts',
  'src/debug-capture/adapters/probes/websocket/index.ts',
  'src/debug-capture/adapters/sinks/index.ts',
  'src/debug-capture/adapters/sinks/download.sink.ts',
  'src/debug-capture/install/index.ts',
  'src/debug-capture/install/install.ts',
  'src/debug-capture/misc/stray.ts',
  'src/app/features/debug-capture/index.ts',
  'src/app/features/debug-capture/capture.token.ts',
  'src/debug-capture/react/index.ts',
  'src/debug-capture/react/react-error-handlers.ts',
]);

/** [importing file, specifier, null when allowed | the rule the violation must cite]. */
const SELF_TEST_CASES = [
  // Required by the PR plan.
  ['src/debug-capture/core/recorder.ts', '../contract', null],
  ['src/debug-capture/core/recorder.ts', '../contract/capture-contract', 'rule 3'],
  ['src/debug-capture/adapters/probes/http/xhr.probe.ts', '../../../core', null],
  ['src/debug-capture/adapters/probes/http/xhr.probe.ts', '../../../contract', 'rule 4'],
  ['src/debug-capture/adapters/probes/http/xhr.probe.ts', '../websocket', 'rule 4'],
  ['src/debug-capture/adapters/probes/index.ts', './http', null],
  ['src/debug-capture/adapters/probes/http/xhr.probe.ts', './headers', null],
  ['src/debug-capture/install/install.ts', '../adapters', null],
  ['src/debug-capture/install/install.ts', '../core', 'rule 4'],
  ['src/debug-capture/core/recorder.ts', 'rxjs', 'rule 5'],
  ['src/debug-capture/core/recorder.ts', '@angular/core', 'rule 5'],
  ['src/app/features/debug-capture/capture.token.ts', '@angular/core', null],
  ['src/app/features/debug-capture/capture.token.ts', '../../../debug-capture', null],
  ['src/app/features/debug-capture/capture.token.ts', '../../../debug-capture/core', 'rule 4'],
  ['src/main.ts', './app/features/debug-capture', null],
  ['src/main.ts', './debug-capture/core', 'rule 7'],
  // The skeleton barrels themselves.
  ['src/debug-capture/core/index.ts', '../contract', null],
  ['src/debug-capture/adapters/index.ts', '../core', null],
  ['src/debug-capture/adapters/index.ts', './probes', null],
  ['src/debug-capture/adapters/index.ts', './probes/http', 'rule 2'],
  ['src/debug-capture/install/index.ts', '../adapters', null],
  ['src/debug-capture/index.ts', './install', null],
  ['src/debug-capture/index.ts', './core', 'rule 4'],
  ['src/app/features/debug-capture/index.ts', '../../../debug-capture', null],
  // Edges.
  ['src/debug-capture/adapters/sinks/download.sink.ts', '../../core', null],
  ['src/debug-capture/adapters/probes/http/xhr.probe.ts', '../../../core/recorder', 'rule 3'],
  ['src/debug-capture/adapters/probes/http/xhr.probe.ts', './missing', 'rule 4'],
  ['src/debug-capture/contract/capture-contract.ts', '../core', 'rule 4'],
  ['src/debug-capture/core/recorder.ts', 'src/debug-capture/contract/capture-contract', 'rule 3'],
  ['src/app/features/debug-capture/capture.token.ts', 'rxjs/operators', null],
  ['src/app/features/debug-capture/capture.token.ts', 'lodash', 'rule 6'],
  ['src/app/app.module.ts', './features/debug-capture', null],
  ['src/app/app.module.ts', '../debug-capture', null],
  ['src/app/app.module.ts', '../debug-capture/install', 'rule 7'],
  ['src/app/app.module.ts', './features/debug-capture/capture.token', 'rule 7'],
  ['src/app/app.module.ts', '@angular/core', null],
  ['src/debug-capture/misc/stray.ts', '.', 'fits no layer'],
  // L6 react: a sibling of the Angular seam, on the L5 barrel, with no packages.
  ['src/debug-capture/react/react-error-handlers.ts', '..', null],
  ['src/debug-capture/react/index.ts', './react-error-handlers', null],
  ['src/debug-capture/react/react-error-handlers.ts', '../install', 'rule 4'],
  ['src/debug-capture/react/react-error-handlers.ts', '../core', 'rule 4'],
  ['src/debug-capture/react/react-error-handlers.ts', 'react', 'rule 5'],
  ['src/debug-capture/react/react-error-handlers.ts', '../../app/features/debug-capture', 'rule 4'],
  ['src/app/features/debug-capture/capture.token.ts', '../../../debug-capture/react', 'rule 4'],
  ['src/debug-capture/index.ts', './react', 'rule 4'],
  ['src/main.ts', './debug-capture/react', null],
  ['src/main.ts', './debug-capture/react/react-error-handlers', 'rule 7'],
];

const EXTRACT_CASES = [
  [`import type { A } from './a';`, ['./a']],
  [`export * from '../b';\nexport { c } from './c';`, ['../b', './c']],
  [`async function f() { await import('./dyn'); }`, ['./dyn']],
  [`// import x from './commented';\nconst s = "import y from './in-string'";`, []],
];

function selfTest() {
  const exists = (p) => VIRTUAL_FILES.has(p);
  const failures = [];

  for (const [from, specifier, expected] of SELF_TEST_CASES) {
    const got = checkImport(from, specifier, exists);
    const pass = expected === null ? got === null : got !== null && got.includes(expected);
    if (!pass) {
      failures.push(`${from} → '${specifier}': expected ${expected === null ? 'ok' : `a ${expected} violation`}, got ${got === null ? 'ok' : `'${got}'`}`);
    }
  }
  for (const [text, expected] of EXTRACT_CASES) {
    const got = extractSpecifiers(text);
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      failures.push(`extract ${JSON.stringify(text)}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
    }
  }

  const total = SELF_TEST_CASES.length + EXTRACT_CASES.length;
  if (failures.length > 0) {
    failures.forEach((f) => console.error(`FAIL ${f}`));
    console.error(`\nself-test: ${failures.length} of ${total} cases failed.`);
    process.exit(1);
  }
  console.log(`self-test: ${total} cases ok`);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

module.exports = { checkImport, classify, extractSpecifiers };

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest();
  else main();
}
