# PR 9 — Review fixes: core + contract (bounded cloning, redaction gaps)

**Branch:** `claude/dc-09-review-fixes-core` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 4 (parallel with PR 10) · **Depends on:** PRs 1–8 (all merged)
**Read first:** `specs/4-debug-capture/plan.md`, then the merged code in
`src/debug-capture/core/` and `src/debug-capture/contract/`.

## Why

A fresh-context adversarial review of the merged layer found these defects.
Each was demonstrated with an experiment spec — see
`/tmp/claude-0/-home-user-angular-13-playground/4384ce31-1a5e-5f84-ad4d-589276735ffa/scratchpad/review-scratch/repo/src/review-x/review.spec.ts`
(read-only evidence; turn the relevant cases into real specs here).

## Owned paths

```
src/debug-capture/contract/**
src/debug-capture/core/**
docs/intent/debug-capture.md        (§4 Security, §5 Memory, §6 Limitations — update to match)
src/debug-capture/README.md         (policy / redaction / limitations sections only)
```

Probes are being fixed in parallel by PR 10 (`adapters/probes/**`) — do not
touch them. Contract changes here are limited to constants and doc comments;
no type shape changes.

## Fixes

### F1 — BLOCKER: one `console.log` can freeze the page and store megabytes
`toJsonSafe` limits depth and per-level width but not **total** size. Shared
(non-circular) sub-objects are re-cloned along every path: a 40-wide, 4-deep
graph whose levels share one child (~160 real objects) took 490 ms in one
`record()` and stored a 33 MB entry.

- Give each cloning call a **total budget**: at most `MAX_CLONE_NODES = 1000`
  nodes (objects, arrays, map/set entries counted as visited) and at most
  `policy.maxBodyLength` characters of string content across the whole log
  entry (all args share one budget). When a budget runs out, every remaining
  value becomes `'[…]'` and the entry still stores.
- Truncate each string leaf (and Error `message`/`stack`) with the existing
  `truncate` semantics so the char budget is honoured (fixes **F2**).
- Change the core function's signature as needed (only `recorder.ts` calls
  it); keep it exported from the core barrel.
- Specs: `bounds total work for a shared-subgraph object` (the reviewer's
  40×4 shared graph: `record()` completes in < 50 ms and the stored entry's
  `JSON.stringify` length is ≤ `maxBodyLength` + 2 KiB);
  `shares one character budget across all args`; `marks values beyond the
  budget with '[…]'`.

### F2 — log strings and Error leaves are never truncated
With `maxBodyLength: 10`, a 100 KB logged string was stored whole. Covered by
F1; add `truncates long string args` and `truncates logged Error message and stack`.

### F3 — secrets leak through logged Maps, JSON strings and error messages
- `console.log(new Map([['authorization', 'Bearer X']]))` → stored unredacted.
  Angular's `HttpHeaders` keeps its values in a `Map`, so logging an
  `HttpRequest` leaks the bearer token. **Fix:** in redaction, a `[Map]`
  entry pair `[key, value]` whose (string) key matches has its value replaced.
- `console.log(JSON.stringify({ password }))` → stored unredacted. **Fix:**
  string leaves of log args go through `redactJsonText` (its cheap
  first-character check keeps this fast).
- `ErrorEntry.message` (e.g. an unhandled rejection of `{ body: { password } }`,
  which the probes stringify to JSON) is only truncated. **Fix:** run
  `redactJsonText` on `message` before truncating.
- Specs: one per path, using the reviewer's inputs.

### F4 — default policy misses common secret shapes
- **Key matching:** compare keys after lower-casing **and removing `_` and
  `-`**, on both sides. `access_token`, `refresh_token`, `api_key`,
  `x-api-key` then match `accesstoken`, `refreshtoken`, `apikey`.
- **Extend defaults** (contract): `redactJsonKeys` += `clientsecret`,
  `idtoken`, `privatekey`, `sessionid`, `sessiontoken`, `csrftoken`,
  `xsrftoken`; `redactHeaders` += `x-csrf-token`, `x-xsrf-token`. Update the
  contract spec's expected defaults.
- **URL query strings:** for `http` and `ws` entries, redact the **values**
  of query parameters whose normalised name matches `redactJsonKeys`
  (`wss://h/ws?access_token=S&x=1` → `wss://h/ws?access_token=[redacted]&x=1`).
  Operate on the raw string (split on `?` / `#` / `&` / first `=`); don't
  round-trip through `URL` (it would re-encode the rest). Applies to
  `ignoreUrls` / `redactBodyUrls` matching? **No** — match those against the
  original URL, redact for storage only.
- **Form bodies:** an http body whose request/response `content-type`
  header contains `application/x-www-form-urlencoded` gets the same
  parameter-value redaction.
- **BOM:** the JSON first-character check skips a leading `﻿`.
- Specs for each.

### F5 — stored entries are only frozen at the top level
A listener could mutate `entry.args` / header maps and the change appeared
in the export. **Fix:** stored entries are deeply immutable — freeze what the
recorder builds (header maps, cloned log values) as it builds them (no
separate deep-freeze walk). Spec: `stored entries are deeply immutable` (a
listener's mutation attempt fails and the snapshot is unchanged).

### F6 — `url` and header values are never truncated
Truncate `url` (after redaction) and each header value to `maxBodyLength`.
Spec: `truncates very long URLs and header values`.

## Docs

Update `docs/intent/debug-capture.md` (§4–6) and the README's policy /
limitations sections to describe: key normalisation, URL and form-body
redaction, the new defaults, the per-entry clone budget. State plainly what is
still **not** redacted (non-JSON text frames such as socket.io `42[…]`,
NDJSON, free-text error messages, logged objects' getters run at log time).

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/core/**/*.spec.ts' --include 'src/debug-capture/contract/**/*.spec.ts'
<run-tests.sh>                       # baseline now 488 SUCCESS
npx ng build                         # report initial total (was 822.44 kB; warning at 850 kB)
```

## Out of scope

Probe changes (PR 10). Any new policy fields — reuse the existing ones.
