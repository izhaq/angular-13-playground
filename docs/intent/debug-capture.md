# Debug Capture — Intent and Decision Record

**Status:** Accepted 2026-10-12.
**For:** Engineering — anyone changing, reviewing or lifting `src/debug-capture/`
into another project.
**Context:** The app runs on air-gapped stations with no browser DevTools. When
something goes wrong there, today nobody can see the console, the failed
request or the socket traffic. This records what we build to fix that, what we
rejected, and why. Implementation plan: `specs/4-debug-capture/plan.md`.

---

## 1. What We're Building

- **Outcome:** A framework-free capture layer that records console output,
  uncaught errors, REST traffic (XHR + fetch) and WebSocket traffic into a
  bounded, redacted in-memory buffer, and exports it as one JSON file a
  developer can read.
- **In scope:** record + redact + bound + export; an optional Angular seam
  (`ErrorHandler` + DI token); wiring in `main.ts` / `AppModule`; keyboard
  shortcuts for download / copy / clear.
- **Out of scope (later work):** any on-screen panel (Network / Socket /
  Console tabs). The recorder exposes `onEntry()` so a panel can be added
  without changing the contract. Also out: an Angular `HttpInterceptor` — the
  XHR probe already sees every `HttpClient` request (Angular's
  `HttpXhrBackend` uses XHR), and adding one would mean editing the
  `provideHttpClient()` call that `provideAuth()` owns.
- **Environment:** Air-gapped, no DevTools. It must work in **production
  builds**, behind a flag: `?debug=1` in the URL, or `debug-capture=1` in
  `localStorage` (wired in PR 8). Without the flag nothing is patched.

---

## 2. Alternatives Considered

**eruda 3.4.3** (MIT, 21k★) — 488 kB raw / 147 kB gzip.
- Bundles chobitsu, which patches XHR, fetch and WebSocket at load and never
  restores them — there is no restore/unpatch code at all.
- Keeps every response body in a module-private `Map` that is set but never
  deleted; its own pre-enable buffer is an unbounded array. Memory grows for
  as long as the page lives.
- Captures WebSocket frames, but its Network panel never displays them.
- No bulk export. The npm package ships no LICENSE file.

**vConsole 3.15.1** (MIT, Tencent) — 280 kB raw / 76 kB gzip.
- Can restore its patches (`unMock()`) and bounds memory
  (`maxNetworkNumber`, default 1000).
- But: zero WebSocket capture, no bulk export, and no release since
  2023-06-01 (issue #718 "has maintenance stopped?" was closed without an
  answer).

**chii** (MIT) — the real Chrome DevTools frontend over a relay server. But an
unauthenticated relay is remote code execution in the user's session. Fine on
dev boxes only.

**Decision: build the capture layer ourselves.** It is needed under every
option: redaction, bounded memory, a real on/off and a file export are
impossible on a capture you don't own. Whether to add an on-screen panel — ours
or a library's, fed from our recorder — is a separate, later decision.

---

## 3. Architecture

Strict layers, one barrel (`index.ts`) each. **Each layer imports only the
barrel of the layer directly above it**, and every barrel re-exports the layer
above, so a layer gets everything from exactly one import path.

```
L1 contract   src/debug-capture/contract/        types + constants only    imports: nothing
L2 core       src/debug-capture/core/            pure logic, no globals    imports: ../contract
L3 adapters   src/debug-capture/adapters/        the only impure code      imports: core barrel
                probes/console  probes/global-error  probes/http
                probes/websocket  sinks
L4 install    src/debug-capture/install/         composition root          imports: ../adapters
L5 public     src/debug-capture/index.ts         export * from './install'
L6 angular    src/app/features/debug-capture/    DI token, ErrorHandler    imports: L5 + @angular/*, rxjs
consumers (src/main.ts, src/app/app.module.ts) import the L6 barrel only
```

Import rules:

1. A file may import files in its own directory.
2. An `index.ts` may also import the `index.ts` of an immediate child
   directory — that is how aggregator barrels work.
3. A file may import the barrel of the layer directly above — the directory,
   never a file inside it.
4. Nothing else: no reaching two layers up, no sibling modules
   (`probes/http` must not import `probes/websocket`), no deep imports.
5. `src/debug-capture/**` has zero package imports.
6. `src/app/features/debug-capture/**` may import `@angular/*` and `rxjs`.
7. Anything else in `src/` imports only the two barrels, never deeper.

Type-only imports, re-exports and dynamic `import()` all count.

**Why:**
- **Portability.** `src/debug-capture/` can be copied into any project —
  Angular or not — because it imports no packages and nothing outside itself.
- **One auditable place touches globals.** Only L3 patches `console`, XHR,
  `fetch`, `WebSocket` and window events. A reviewer checking "what does this
  do to my page?" reads one directory.
- **Enforced, not hoped for.** A deep import compiles fine, so the rules are
  checked by `npm run lint:layers` (`scripts/check-debug-capture-layers.js`).

---

## 4. Security

- **Redaction happens before storage, never at display.** The recorder applies
  the policy on the way into the buffer, so an exported file cannot contain
  anything the policy removed.
- **Default redactions:**
  - Headers: `authorization`, `proxy-authorization`, `cookie`, `set-cookie`,
    `x-api-key`, `x-auth-token`.
  - JSON keys, anywhere in request/response bodies, WebSocket text frames and
    logged objects: `password`, `passwd`, `secret`, `token`, `accesstoken`,
    `refreshtoken`, `apikey`, `authorization` (case-insensitive).
- This app's login request body `{ username, password, mode, position }` is
  covered by the `password` key.
- **Exported files may still contain business data** (experiment values,
  usernames, URLs). Treat them as sensitive and hand them over the same way as
  any other internal data.

---

## 5. Memory and Performance

- **Ring buffer**, 5000 entries by default: the oldest entry is evicted.
- **Body truncation**, 32 KiB by default, for bodies, frame data, messages and
  stacks, with a marker.
- **JSON-safe cloning of log arguments** at record time (depth-limited): the
  buffer never holds live object references, so it cannot keep app objects
  alive.
- **Optional `sample()`** in the policy to drop drafts from chatty sockets —
  the system-experiments grid streams many frames per second. **No sampling
  by default**; turn it on only if a capture proves too noisy.
- **Lean:** it ships in the production bundle (initial total 800.5 kB against
  an 850 kB warning budget), so the target is the whole layer under 15 kB raw.

---

## 6. Known Limitations

- Requests are recorded **on completion** (load, error, abort or timeout). A
  request that never finishes does not appear.
- Sockets created **before install** are not captured.
- Streaming response bodies (`text/event-stream`) and binary `fetch` bodies
  are not read.
- Pages that load **before the flag is set** capture nothing — set the flag,
  then reload.

---

## 7. Decisions Made

| # | Decision | Why |
|---|----------|-----|
| 1 | Build our own capture layer; no eruda / vConsole / chii | Redaction, bounded memory, real on/off and export need a capture we own (§2) |
| 2 | Framework-free core, Angular only in L6 | Portable to any project (§3) |
| 3 | Strict one-barrel layers, checked by `npm run lint:layers` | Deep imports compile; only a check keeps the layers honest (§3) |
| 4 | Redact before storage, with sensitive defaults | Nothing the policy removed can leak through an export (§4) |
| 5 | Ring buffer + truncation + JSON-safe clones | Memory stays bounded on long-running stations (§5) |
| 6 | Production builds, behind `?debug=1` / `localStorage` flag | The stations that need it run production builds (§1) |
| 7 | On-screen panel deferred | Separate decision; `onEntry()` keeps the door open (§1) |
