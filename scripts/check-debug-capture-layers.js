#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Debug-capture boundary checker (`npm run lint:layers`).
 *
 * The debug panel comes from the package `debug-capture` (its own repository,
 * izhaq/debug-capture; installed from `vendor/debug-capture-<version>.tgz`).
 * The app touches it in one folder only, so it stays easy to update or remove
 * (docs/debug-panel.md):
 *
 *   rule 1  only files under src/app/features/debug-panel/ may import
 *           `debug-capture` or `debug-capture/<entry>`
 *   rule 2  code outside that folder imports it only through its barrel
 *           (src/app/features/debug-panel/index.ts), never a file behind it
 *
 * Usage:
 *   node scripts/check-debug-capture-layers.js              # check src/
 *   node scripts/check-debug-capture-layers.js --self-test  # run the rule table
 *
 * Specifiers come from `ts.preProcessFile`, so `import type`, `export … from`
 * and dynamic `import()` all count, and imports inside comments or strings do
 * not. Exit code 1 on any violation, 0 on a clean run.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const FOLDER = 'src/app/features/debug-panel';
const BARREL = `${FOLDER}/index.ts`;
const PACKAGE = /^debug-capture(\/|$)/;

/** `from` is a repo-relative POSIX path; returns null when allowed, else the reason. */
function checkImport(from, specifier) {
  const inside = from.startsWith(`${FOLDER}/`);
  if (PACKAGE.test(specifier)) {
    return inside ? null : `only ${FOLDER}/ may import the debug-capture package (rule 1)`;
  }
  if (inside || !specifier.startsWith('.')) return null;
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  if (target === FOLDER || target === BARREL || target === BARREL.replace(/\.ts$/, '')) return null;
  return target.startsWith(`${FOLDER}/`) ? `import ${FOLDER}/ through its index.ts only (rule 2)` : null;
}

function check(files) {
  const violations = [];
  for (const [file, text] of files) {
    for (const { fileName } of ts.preProcessFile(text, true, true).importedFiles) {
      const reason = checkImport(file, fileName);
      if (reason) violations.push(`${file}: '${fileName}' — ${reason}`);
    }
  }
  return violations;
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

const CASES = [
  ['src/app/features/debug-panel/debug-panel.ts', 'debug-capture/activate', null],
  ['src/app/features/debug-panel/debug-panel.ts', 'debug-capture', null],
  ['src/app/features/debug-panel/debug-panel.spec.ts', './debug-panel', null],
  ['src/main.ts', './app/features/debug-panel', null],
  ['src/app/app.module.ts', './features/debug-panel', null],
  ['src/app/app.module.ts', './features/debug-panel/index', null],
  ['src/app/app.module.ts', '@angular/core', null],
  ['src/main.ts', 'debug-capture', 'rule 1'],
  ['src/app/app.component.ts', 'debug-capture/panel', 'rule 1'],
  ['src/app/app.module.ts', './features/debug-panel/debug-panel', 'rule 2'],
  ['src/app/x/y.ts', '../../app/features/debug-panel/debug-panel', 'rule 2'],
  ['src/app/x/y.ts', 'debug-capture-other', null],
];

function selfTest() {
  let failed = 0;
  for (const [from, spec, want] of CASES) {
    const got = checkImport(from, spec);
    const ok = want === null ? got === null : got !== null && got.includes(want);
    if (!ok) {
      failed += 1;
      console.error(`FAIL ${from} → '${spec}': expected ${want ?? 'allowed'}, got ${got ?? 'allowed'}`);
    }
  }
  if (failed > 0) {
    console.error(`\nself-test: ${failed} of ${CASES.length} cases failed.`);
    process.exit(1);
  }
  console.log(`self-test: ${CASES.length} cases ok`);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  selfTest();
  const root = path.resolve(__dirname, '..');
  const files = new Map(
    walk(path.join(root, 'src')).map((abs) => [path.relative(root, abs).split(path.sep).join('/'), fs.readFileSync(abs, 'utf8')]),
  );
  const violations = check(files);
  if (violations.length > 0) {
    violations.forEach((v) => console.error(v));
    console.error(`\n${violations.length} violation${violations.length === 1 ? '' : 's'}.`);
    process.exit(1);
  }
  console.log(`ok — debug-capture boundary holds across ${files.size} files in src/`);
}
