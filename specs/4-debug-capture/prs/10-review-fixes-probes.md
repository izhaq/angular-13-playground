# PR 10 — Review fixes: probes (reused XHR, zone cost, dispose, fetch bodies)

**Branch:** `claude/dc-10-review-fixes-probes` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 4 (parallel with PR 9) · **Depends on:** PRs 1–8 (all merged)
**Read first:** `specs/4-debug-capture/plan.md`, then the merged probes in
`src/debug-capture/adapters/probes/`.

## Why

A fresh-context adversarial review found these defects; most were
demonstrated with experiment specs — see
`/tmp/claude-0/-home-user-angular-13-playground/4384ce31-1a5e-5f84-ad4d-589276735ffa/scratchpad/review-scratch/repo/src/review-x/review.spec.ts`
(read-only evidence; turn the relevant cases into real specs here).

## Owned paths

`src/debug-capture/adapters/probes/**` only. Core/contract are being changed
in parallel by PR 9 — do not touch them, and don't rely on any change there.
Public probe signatures stay exactly as they are.

## Fixes

### P1 — BLOCKER: a reused XHR records the wrong request and loses both
If the app calls `open()` + `send()` again **inside its own `load`/`error`
handler** (retry code does this), the first request's `loadend` fires
afterwards, with `readyState` 1. The probe finds the *new* request's state,
records it with status `null` / body `null`, and deletes it — the first
request is lost and the second one's real completion is never recorded.

- Give each `open()` its own request state (a generation), and make
  `loadend` handling ignore stale events: a `loadend` whose `xhr.readyState`
  is not `DONE` (4) belongs to a request that `open()` already replaced.
- In the `open` wrapper, **before** calling the original: if the instance has
  a sent-but-unrecorded request, finalise it now —
  - if `xhr.readyState === 4` (we're inside its `load`/`error`/`abort`
    handler): record it from the current `status`, headers and body (still
    readable before the original `open` resets them);
  - otherwise (still in flight; the original `open` will silently abort it,
    firing no events): record it with `status: null`, `error: 'abort'`.
  Then mark it recorded so nothing records it twice.
- Specs with a **real** XHR (subclass host + `blob:` URL):
  `records both requests when the app re-opens inside its load handler`,
  `records an in-flight request replaced by open() as aborted`,
  `never records one request twice`.

### P2 — every WebSocket frame (and XHR/fetch completion) costs an extra Angular change detection
zone.js wraps the probes' `addEventListener` calls, so each probe listener
run is its own zone task inside Angular's zone, and each task ends in a
change-detection pass. Measured: 10 frames → 10 ticks without the probe, 20
with it. The grid socket streams many frames per second.

- Register probe listeners **outside any zone** when zone.js is present:
  `globalThis.Zone?.root.run(() => target.addEventListener(type, fn))`,
  falling back to a plain `addEventListener` when `Zone` is absent. Read
  `Zone` structurally off `globalThis` — no package import (layer rule 5).
  Apply to: WebSocket listeners (open/message/close/error), XHR listeners
  (abort/timeout/error/loadend), and the fetch body read (run the
  `clone()`/read chain inside `Zone.root.run`). The promise returned **to the
  caller** must stay in the caller's zone — don't move that.
- A tiny helper per module (`websocket/`, `http/`) — siblings can't share
  code (layer rule 4); note the duplication in a comment.
- Specs (zone.js is loaded in Karma): fork a zone that counts
  `onInvokeTask`; inside it, create the socket / XHR through the probe and
  attach an app listener; dispatch / complete; assert the counting zone saw
  only the app's task, not the probe's. One spec per module:
  `probe listeners run outside the app's zone`.

### P3 — disposed probes keep the recorder (and its buffer) alive
Pass-through wrappers left in someone else's chain, and listeners on sockets
that stay open, close over `recorder` — up to 5000 entries kept for the page
lifetime. **Fix:** every probe holds the recorder in a variable it sets to
`null` on `dispose()` and records through it. Apply to console, global-error,
xhr, fetch, websocket. Spec per probe: `drops its recorder reference on dispose`
(e.g. assert via a recorder whose `record` is a spy that must not be called,
plus that the probe no longer references it — a `WeakRef` check is not
reliable in Karma; asserting behaviour after dispose plus code review is
enough).

### P4 — a fetch aborted while its body is read is recorded as a success
Status 200, `error: null`. **Fix:** if reading the clone rejects with an
`AbortError`, record `error: 'abort'` (keep the status we saw). Spec.

### P5 — an endless textual stream is buffered without limit
`clone().text()` on an endless `application/x-ndjson` (or any never-ending
textual) response holds the whole stream in memory. **Fix:** read the clone
through `body.getReader()` + `TextDecoder`, stop after
`MAX_CAPTURED_BODY_CHARS = 1_048_576` characters, `cancel()` the reader
(cancelling the clone's branch does not affect the app's body), and append
`'…[capture stopped at 1048576 chars]'`. Fall back to `text()` when
`body`/`getReader` is unavailable. `text/event-stream` stays unread. Spec
with a real `ReadableStream`-backed `Response` that never closes:
`stops reading an endless text body at the cap and leaves the app's body readable`.

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/adapters/probes/**/*.spec.ts'
<run-tests.sh>                       # baseline now 488 SUCCESS
```

## Out of scope

Redaction, truncation, cloning (PR 9). Base64 work on binary frames before
sampling (documented follow-up, not a defect).
