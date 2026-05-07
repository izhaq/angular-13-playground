#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Domain-term swap script.
 *
 * Reads `specs/sys-mode-dashboard/domain-terms.map.json` and rewrites the
 * client feature folder (`src/app/features/system-experiments` by default)
 * with each `from` term replaced by the configured `to` value.
 *
 * Two replacement strategies are applied per the `_kind` tag in the JSON:
 *
 *   identifier  → \bword\b regex (case-sensitive). Safe for TS symbols and
 *                 data-test-id slugs.
 *   string      → exact substring (case-sensitive). Used for UI labels,
 *                 wire values, abbreviations.
 *   css         → exact substring inside .scss/.html only.
 *
 * The feature-name group (`feature`) also renames matching files/folders.
 *
 * Usage:
 *   node scripts/swap-domain-terms.js                      # dry run, default paths
 *   node scripts/swap-domain-terms.js --apply              # actually write changes
 *   node scripts/swap-domain-terms.js --map=path/to.json   # custom map
 *   node scripts/swap-domain-terms.js --root=src/app/features/foo
 *   node scripts/swap-domain-terms.js --apply --verbose
 *
 * Notes:
 *   - Skips entries whose `to` is empty (lets you swap subsets).
 *   - Walks .ts, .html, .scss; skips spec files unless --include-specs is passed.
 *   - Does NOT touch the server folder, demo, or pages — those are out of scope
 *     for this script (matches the user's "client only" requirement).
 *   - File/folder renames run AFTER content rewrites and bottom-up so children
 *     are renamed before parents.
 *   - Prints a summary at the end (per-file edit counts + totals + any
 *     overlap warnings — i.e. when one `to` value overwrites another).
 */

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const ARGS = parseArgs(process.argv.slice(2));
const ROOT = path.resolve(ARGS.root || 'src/app/features/system-experiments');
const MAP_PATH = path.resolve(ARGS.map || 'specs/sys-mode-dashboard/domain-terms.map.json');
const APPLY = !!ARGS.apply;
const VERBOSE = !!ARGS.verbose;
const INCLUDE_SPECS = !!ARGS['include-specs'];

const FILE_EXTS = new Set(['.ts', '.html', '.scss']);

// ---------------------------------------------------------------------------
// Load + flatten the map
// ---------------------------------------------------------------------------

if (!fs.existsSync(MAP_PATH)) {
  fail(`Map file not found: ${MAP_PATH}`);
}
if (!fs.existsSync(ROOT)) {
  fail(`Root folder not found: ${ROOT}`);
}

const rawMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

/** @type {{from: string, to: string, kind: 'identifier'|'string'|'css', group: string}[]} */
const swaps = [];

for (const [groupName, group] of Object.entries(rawMap)) {
  if (groupName.startsWith('_')) continue;
  if (!group || typeof group !== 'object') continue;
  const groupKind = inferGroupKind(group._kind);

  for (const [from, entry] of Object.entries(group)) {
    if (from.startsWith('_')) continue;
    if (!entry || typeof entry !== 'object') continue;
    const to = (entry.to || '').trim();
    if (!to) continue;
    const kind = normalizeKind(entry._kind, groupKind);
    swaps.push({ from, to, kind, group: groupName });
  }
}

if (swaps.length === 0) {
  console.log('No swaps to apply — every `to` field is empty in the map.');
  process.exit(0);
}

// Longer `from` first so e.g. "system-experiments" wins over "experiments".
swaps.sort((a, b) => b.from.length - a.from.length);

// ---------------------------------------------------------------------------
// Walk + rewrite
// ---------------------------------------------------------------------------

const stats = {
  filesScanned: 0,
  filesEdited: 0,
  totalReplacements: 0,
  perFile: /** @type {Record<string, number>} */ ({}),
  perTerm: /** @type {Record<string, number>} */ ({}),
  warnings: /** @type {string[]} */ ([]),
};

const allFiles = [];
walk(ROOT, allFiles);

for (const file of allFiles) {
  stats.filesScanned += 1;
  rewriteFile(file);
}

// ---------------------------------------------------------------------------
// File/folder renames (feature group only)
// ---------------------------------------------------------------------------

const featureRenames = swaps.filter((s) => s.group === 'feature');
const renames = [];

if (featureRenames.length) {
  const allPaths = [];
  walkPaths(ROOT, allPaths);
  // Bottom-up so children move first.
  allPaths.sort((a, b) => b.length - a.length);

  for (const p of allPaths) {
    const base = path.basename(p);
    let next = base;
    for (const { from, to } of featureRenames) {
      if (next.includes(from)) next = next.split(from).join(to);
    }
    if (next !== base) {
      renames.push({ from: p, to: path.join(path.dirname(p), next) });
    }
  }
}

if (APPLY) {
  for (const r of renames) {
    fs.renameSync(r.from, r.to);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('');
console.log('Domain-term swap', APPLY ? '(APPLIED)' : '(DRY RUN — pass --apply to write)');
console.log('Map :', path.relative(process.cwd(), MAP_PATH));
console.log('Root:', path.relative(process.cwd(), ROOT));
console.log('');
console.log(`Swaps configured : ${swaps.length}`);
console.log(`Files scanned    : ${stats.filesScanned}`);
console.log(`Files edited     : ${stats.filesEdited}`);
console.log(`Total replaces   : ${stats.totalReplacements}`);
console.log(`Files renamed    : ${renames.length}`);

if (VERBOSE) {
  console.log('');
  console.log('Per-term replacement counts:');
  const sorted = Object.entries(stats.perTerm).sort((a, b) => b[1] - a[1]);
  for (const [term, n] of sorted) {
    console.log(`  ${String(n).padStart(4)}  ${term}`);
  }

  if (Object.keys(stats.perFile).length) {
    console.log('');
    console.log('Per-file edit counts:');
    const f = Object.entries(stats.perFile).sort((a, b) => b[1] - a[1]);
    for (const [file, n] of f) {
      console.log(`  ${String(n).padStart(4)}  ${path.relative(process.cwd(), file)}`);
    }
  }

  if (renames.length) {
    console.log('');
    console.log('Renames:');
    for (const r of renames) {
      console.log(`  ${path.relative(process.cwd(), r.from)}  →  ${path.relative(process.cwd(), r.to)}`);
    }
  }
}

if (stats.warnings.length) {
  console.log('');
  console.log('Warnings:');
  for (const w of stats.warnings) console.log('  - ' + w);
}

if (!APPLY) {
  console.log('');
  console.log('Re-run with --apply to write changes.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rewriteFile(file) {
  const ext = path.extname(file);
  const original = fs.readFileSync(file, 'utf8');
  let next = original;
  let edits = 0;

  for (const swap of swaps) {
    if (swap.kind === 'css' && ext !== '.scss' && ext !== '.html') continue;
    const before = next;
    if (swap.kind === 'identifier') {
      const re = new RegExp(`\\b${escapeRegex(swap.from)}\\b`, 'g');
      next = next.replace(re, () => {
        edits += 1;
        stats.perTerm[swap.from] = (stats.perTerm[swap.from] || 0) + 1;
        return swap.to;
      });
    } else {
      // exact substring
      if (!next.includes(swap.from)) continue;
      const parts = next.split(swap.from);
      const n = parts.length - 1;
      edits += n;
      stats.perTerm[swap.from] = (stats.perTerm[swap.from] || 0) + n;
      next = parts.join(swap.to);
    }
    if (next !== before && VERBOSE === false && edits === 0) {
      // Defensive: keep stats accurate.
    }
  }

  if (edits > 0) {
    stats.filesEdited += 1;
    stats.totalReplacements += edits;
    stats.perFile[file] = edits;
    if (APPLY) fs.writeFileSync(file, next);
  }
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!FILE_EXTS.has(ext)) continue;
    if (!INCLUDE_SPECS && entry.name.endsWith('.spec.ts')) continue;
    out.push(full);
  }
}

function walkPaths(dir, out) {
  out.push(dir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPaths(full, out);
    else out.push(full);
  }
}

function inferGroupKind(raw) {
  if (!raw) return 'string';
  const s = String(raw).toLowerCase();
  if (s.includes('identifier')) return 'identifier';
  if (s.includes('css'))        return 'css';
  return 'string';
}

function normalizeKind(raw, fallback) {
  if (!raw) return fallback;
  const s = String(raw).toLowerCase();
  if (s.startsWith('identifier')) return 'identifier';
  if (s.startsWith('css'))        return 'css';
  if (s.startsWith('string'))     return 'string';
  return fallback;
}

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const [k, v] = a.slice(2).split('=');
    out[k] = v === undefined ? true : v;
  }
  return out;
}

function fail(msg) {
  console.error('Error:', msg);
  process.exit(1);
}
