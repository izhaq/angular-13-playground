# PR 12 — Confirmation-review fixes: stack leak, URL-param redaction, hot-path cost

**Branch:** `claude/dc-12-confirm-review-fixes` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 5 · **Depends on:** PRs 1–10 (all merged)
**Read first:** `specs/4-debug-capture/plan.md`, then `src/debug-capture/core/`
(especially `redact.ts`, `json-safe.ts`, `recorder.ts` as changed by PR 9).

## Why

A second fresh-context review confirmed the first review's findings fixed
(7 of 8 fully) and found the issues below, each demonstrated. Evidence specs:
`/tmp/claude-0/-home-user-angular-13-playground/4384ce31-1a5e-5f84-ad4d-589276735ffa/scratchpad/review-scratch/review-y-parked/confirm.spec.ts`
and `confirm2.spec.ts` (read-only; turn the relevant cases into real specs here).

## Owned paths

```
src/debug-capture/core/**
src/debug-capture/contract/**        (doc comments / defaults only, if needed)
docs/intent/debug-capture.md
src/debug-capture/README.md
```

## Fixes

### C1 (should-fix, leak) — stacks repeat the secret the message hid
`new Error('GET wss://h/ws?access_token=SECRET_A failed')` stores a redacted
`message` but the `stack` ("Error: GET wss://h/ws?access_token=SECRET_A failed …")
keeps it. Same for an unhandled rejection of `new Error('{"password":"S"}')`
and window error events, and for Errors inside logged args (`json-safe.ts`).
**Fix:** wherever a message is redacted, redact its stack too: if the raw
message occurs in the stack's first line (`${name}: ${message}`), replace
that occurrence with the redacted message; then apply URL-param redaction to
the (truncated) stack. Specs for `ErrorEntry` (window + unhandledrejection
paths) and for a logged `Error`.

### C2 (should-fix, leak + data loss) — URL-parameter redaction regex
- **Leaks:** `?next=/cb?access_token=S6`, `?redirect=https://x/y?token=S7&z=1`
  (the inner `?` is swallowed into the first value), `?returnUrl=%2Fp%3Ftoken%3DS8`
  (encoded inner URL), `?access_token[]=S9` (bracket name).
- **Data loss:** applied to raw JSON text, a value runs to the next
  whitespace: `{"url":"https://h/x?token=abc","status":401,"detail":"boom"}`
  became `{"url":"https://h/x?token=[redacted]` — status and detail gone, no
  marker.
- **Gap:** URLs inside JSON bodies/frames are not param-redacted at all
  (`{"next":"…?access_token=S21"}`).
**Fix:**
- Treat `?` as a parameter separator too; a value stops at `&`, `#`, `?`,
  whitespace, `"`, `'`, `<`, `>`.
- Normalise parameter **names** by percent-decoding and stripping a trailing
  `[…]` before matching.
- A value that percent-decodes to something containing a secret parameter
  (recursive check, bounded depth) is replaced whole by `redactedValue`.
- For JSON text, apply param redaction to **string leaves** inside the JSON
  redaction walk (only strings containing `=`), never to the raw JSON text —
  this both stops the data loss and covers URLs inside JSON.
- Specs: every input above, plus "JSON with a URL value keeps its other
  fields".

### C3 (should-fix, perf regression from PR 9) — param redaction before truncation
`redactParams` runs over the whole text before truncation, one callback per
`name=value`: a 10 MB `k=v&…` body took 863 ms (0.2 ms before PR 9).
**Fix:** for non-JSON text (form bodies, log strings, messages, stacks),
**truncate first, then param-redact** (a parameter cut by truncation is gone
anyway). Spec: `param redaction of a 10 MB form body completes in < 50 ms`.

### C4 (nit) — clone budget ignores `Object.keys` cost
A dict with 200k keys shared by 100 logged rows took 343 ms. **Fix:** within
one clone call, memoise already-cloned (non-ancestor) objects and reuse their
frozen clone, and stop enumerating an object's keys once the remaining budget
is spent (don't materialise `Object.keys` of a 200k-key object just to use
100). Spec: the reviewer's input completes in < 50 ms.

### C5 (nit, hot path) — suffix matching slows busy JSON frames ~2.2×
**Fix:** cache `isSecretKey` results per key string (a bounded `Map`, e.g.
cleared at 2000 entries) keyed per secret set; leave `null` and boolean
values unredacted (they carry no secret, and `"[redacted]"` in place of
`null` misleads a reader into thinking a token was present). Spec: the
null/boolean rule; a micro-benchmark spec is optional.

### C6 (nit, policy) — secret-looking header names pass
`x-access-token`, `x-refresh-token` are stored as-is because header names
match exactly. **Fix:** a header is redacted if its name is in
`redactHeaders` (exact) **or** its normalised name matches `redactJsonKeys`
by suffix (`isSecretKey`). Spec. (OAuth `?code=` / `X-Amz-Signature`: add
`signature` to the default `redactJsonKeys` — suffix-matches
`xamzsignature`; leave `code` alone, too generic — document it.)

## Docs (ADR §4–6 and README)

- Correct §4 so it states exactly what stacks / URLs / JSON get.
- Add these README "Known limitations" bullets (from the orchestrator):
  - Text `fetch` bodies are read up to 1,048,576 characters; after that the
    capture stops and says so (streaming `text/event-stream` and binary
    bodies are not read at all).
  - Binary WebSocket frames are base64-encoded before `sample()` runs, so
    sampling saves memory but not that work. Text frames (this app's) are
    not affected.
  - `recorder.onEntry()` listeners for network entries run **outside**
    Angular's zone (so capture costs no change detection); a future
    on-screen panel must re-enter the zone (`NgZone.run`) to update its view.
  - OAuth `code` query parameters are not redacted (the name is too generic);
    add `code` to `redactJsonKeys` if needed.

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/core/**/*.spec.ts' --include 'src/debug-capture/contract/**/*.spec.ts'
<run-tests.sh>                       # baseline now 549 SUCCESS
npx ng build                         # report initial total (was 826.84 kB)
```

## Out of scope

Probes, install, Angular layer.
