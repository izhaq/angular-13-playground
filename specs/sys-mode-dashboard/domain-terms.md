# Domain-Term Swap

A scripted way to rename every domain-specific term in the
`system-experiments` client feature folder to another domain (e.g. when
migrating the feature into a host project that uses different vocabulary).

This rewrites TS symbols, HTML strings, SCSS class fragments, file names,
and folder names in one pass.

---

## Files

| File                                                       | Purpose                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `specs/sys-mode-dashboard/domain-terms.map.json`           | The canonical inventory. Every domain-specific term grouped by category, with empty `to` slots — fill these in for a real migration. |
| `specs/sys-mode-dashboard/domain-terms.map.pizza.json`     | A fully-populated example map (pizza-business domain) for testing the script end-to-end.      |
| `scripts/swap-domain-terms.js`                             | The Node script. No dependencies, no install.                                                 |
| `package.json` → `swap-domain-terms`                       | npm shortcut.                                                                                 |

The script ships with two replacement modes per the `_kind` tag in each
map entry:

- `identifier` → `\bword\b` regex (case-sensitive). Safe for TS symbols
  and `data-test-id` slugs.
- `string`     → exact substring (case-sensitive). Used for UI labels,
  wire option values, grid abbreviations.
- `css`        → exact substring inside `.scss` / `.html` only.

The `feature` group additionally renames matching files and folders
bottom-up (children before parents).

---

## Quick start — test with the pizza map

1. Make sure your branch is clean. `git status` should be empty.
2. Dry run with verbose output so you can see every swap before writing
   anything:
   ```bash
   npm run swap-domain-terms -- \
     --map=specs/sys-mode-dashboard/domain-terms.map.pizza.json \
     --verbose
   ```
3. If the per-term and per-file counts look right, apply for real:
   ```bash
   npm run swap-domain-terms -- \
     --map=specs/sys-mode-dashboard/domain-terms.map.pizza.json \
     --apply
   ```
4. Verify nothing is broken:
   ```bash
   npm run build
   npm test
   ```
5. Take a peek at the running app:
   ```bash
   npm start
   ```
   The shell should now read "Service / Open / Closed", "Order Tickets",
   "Cheese / Toppings / Rush Order", grid columns "DT1…UT4 / DSPd / DSPu /
   APP", etc.
6. Revert when you're done playing:
   ```bash
   git reset --hard HEAD && git clean -fd
   ```
   (`-fd` is needed because the rename moves files into a new
   `pizza-dashboard/` folder that isn't tracked yet.)

---

## Real migration workflow

1. Copy the canonical map so the original stays as documentation:
   ```bash
   cp specs/sys-mode-dashboard/domain-terms.map.json \
      specs/sys-mode-dashboard/domain-terms.map.<your-domain>.json
   ```
2. Open your copy and fill in the `to` field for every term you want
   renamed. Leave `to` empty to skip a term — the script silently
   ignores blank targets.
3. Dry-run with `--verbose` to see what will change:
   ```bash
   npm run swap-domain-terms -- \
     --map=specs/sys-mode-dashboard/domain-terms.map.<your-domain>.json \
     --verbose
   ```
4. Watch out for **string overlap warnings** in the source map. Some
   labels are reused across two contexts (e.g. `"Mtr Rec"` is shared by
   `mtrRec` and `gsMtrRec`); a single global string swap will replace
   both. The pizza map's `_known_overlaps` block lists the offenders to
   look out for.
5. Apply when satisfied:
   ```bash
   npm run swap-domain-terms -- \
     --map=specs/sys-mode-dashboard/domain-terms.map.<your-domain>.json \
     --apply
   ```
6. Optionally rewrite spec files in the same pass (held back by default
   so you can choose):
   ```bash
   npm run swap-domain-terms -- \
     --map=specs/sys-mode-dashboard/domain-terms.map.<your-domain>.json \
     --apply --include-specs
   ```
7. `npm run build && npm test` — both should be clean.
8. `git diff --stat` to scan for any unintended hits before
   committing — exact-string replacement always carries that risk for
   short tokens.

---

## CLI reference

```
node scripts/swap-domain-terms.js [--apply] [--verbose] [--include-specs]
                                  [--map=path/to/map.json]
                                  [--root=src/app/features/<feature>]
```

| Flag               | Default                                             | Purpose                                                                                              |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `--apply`          | off (dry-run)                                       | Actually write file changes and rename files/folders. Without this the script just prints a report.  |
| `--verbose`        | off                                                 | Print per-term replacement counts, per-file edit counts, and the full rename list.                   |
| `--include-specs`  | off                                                 | Include `*.spec.ts` files in the rewrite. Skipped by default so production rewrites and test edits can be staged separately. |
| `--map=PATH`       | `specs/sys-mode-dashboard/domain-terms.map.json`    | Path to the swap map JSON.                                                                           |
| `--root=PATH`      | `src/app/features/system-experiments`               | Folder to rewrite. The `feature` group renames this folder too.                                      |

Exit code is always `0` for normal runs. Errors (missing map, missing root) print to stderr and exit `1`.

---

## Map file format

Each top-level group has an optional `_kind` (defaults to `string`).
Each non-`_`-prefixed key inside a group is a `from` term, and its value
is `{ to: "<replacement>", _kind?: "<override>", _note?: "..." }`. Empty
`to` values are silently skipped — that's how you partially fill the map.

```json
{
  "primaryFields": {
    "_kind": "identifiers (field keys)",
    "tff":           { "to": "cheese" },
    "mlmTransmit":   { "to": "sendToOven" }
  },
  "primaryFieldLabels": {
    "_kind": "strings",
    "TFF":          { "to": "Cheese" },
    "MLM transmit": { "to": "Send to Oven" }
  }
}
```

The script flattens all groups, sorts swaps by descending `from` length
(so `system-experiments` wins over any shorter overlap), then iterates
the file tree once.
