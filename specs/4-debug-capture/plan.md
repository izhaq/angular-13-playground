# Master Plan: Debug Capture (air-gapped logs + network recorder)

**Status:** Done 2026-10-13 — all PRs merged into the integration branch, reviewed and tested. Not merged to `main`.
**Integration branch:** `claude/air-gapped-debug-logging-zkn1nr` — every PR in
this plan targets it. Nothing here merges to `main` until the whole plan is
done and reviewed.
**Per-PR plans:** `specs/4-debug-capture/prs/01-…08-*.md`. Each is the full
brief for one agent; this file is the map that ties them together.

## Why

The app runs on air-gapped machines where browser DevTools are not available.
We need, in production builds and behind a flag, a record of console output,
uncaught errors, REST traffic (XHR + fetch) and WebSocket traffic, that can be
exported as a file and handed to a developer.

Library options (eruda, vConsole, chii) were researched and rejected for this
first step: eruda cannot release its patches or bound its memory; vConsole has
had no release since 2023-06 and has zero WebSocket capture. The capture layer
below is needed under every option anyway — it is the only way to get
redaction, bounded memory, real on/off and export.

## Scope

**In:** the framework-free capture layer (record + redact + bound + export),
an optional Angular seam (ErrorHandler + DI token), wiring in `main.ts` /
`AppModule`, keyboard shortcuts for download / copy / clear.

**Out (later work):** any on-screen panel (Network / Socket / Console tabs).
The recorder exposes `onEntry()` so a panel can be added without changing the
contract. Also out: an Angular `HttpInterceptor` — the XHR probe already sees
every `HttpClient` request (Angular's `HttpXhrBackend` uses XHR), and adding
one would mean editing the `provideHttpClient()` call that `provideAuth()`
owns.

## Architecture: strict layers, one barrel each

Drawn top-down. **Each layer imports only the barrel (`index.ts`) of the one
layer directly above it.** Every barrel re-exports the full public API of the
layer above (`export * from '<layer above>'`) plus its own, so a layer gets
everything it needs from exactly one import path.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ L1 contract   src/debug-capture/contract/        types + constants only   │
│                imports: nothing                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ L2 core       src/debug-capture/core/            pure logic, no globals   │
│                imports: ../contract                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ L3 adapters   src/debug-capture/adapters/        the only impure code     │
│                 probes/console  probes/global-error  probes/http          │
│                 probes/websocket  sinks                                   │
│                imports: core barrel                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ L4 install    src/debug-capture/install/         composition root         │
│                imports: ../adapters                                       │
├──────────────────────────────────────────────────────────────────────────┤
│ L5 public     src/debug-capture/index.ts         export * from './install' │
├──────────────────────────────────────────────────────────────────────────┤
│ L6 angular    src/app/features/debug-capture/    DI token, ErrorHandler   │
│                imports: src/debug-capture (L5) + @angular/*               │
├──────────────────────────────────────────────────────────────────────────┤
│ L6 react      src/debug-capture/react/           React error callbacks    │
│                imports: src/debug-capture (L5) only — no packages         │
└──────────────────────────────────────────────────────────────────────────┘
  consumers (src/main.ts, src/app/app.module.ts) import the L6 barrel only
  the two L6 seams are siblings; the L5 barrel re-exports neither
```

### Import rules (enforced by `npm run lint:layers`, added in PR 1)

1. A file may import files **in its own directory** (`./x`).
2. An `index.ts` may also import the `index.ts` of an **immediate child
   directory** (`./probes`) — that is how aggregator barrels work.
3. A file may import the **barrel of the layer directly above** — the
   directory, never a file inside it (`../../../core`, not
   `../../../core/recorder`).
4. Nothing else. No reaching two layers up, no sibling modules
   (`probes/http` must not import `probes/websocket`), no deep imports.
5. `src/debug-capture/**` has **zero package imports** — no `@angular/*`, no
   `rxjs`, nothing from `node_modules`. That is what makes it portable.
6. `src/app/features/debug-capture/**` may import `@angular/*` and `rxjs`.
7. Anything else in `src/` may import only the L5 barrel or an L6 barrel
   (`src/debug-capture`, `src/app/features/debug-capture` or
   `src/debug-capture/react`), never deeper.

Type-only imports, re-exports and dynamic `import()` all count.

## Design rules every PR follows

- **Probes are reversible.** `Probe.dispose()` restores the original global and
  is idempotent. If someone else patched on top of us, we cannot unwrap — the
  wrapper turns into a pass-through instead. After `dispose()` nothing more is
  recorded, including from sockets/requests that were already in flight.
- **Probes take an injected host.** Every probe's last parameter is the object
  it patches, defaulting to the real global. Specs pass fakes and never touch
  `window` — the rule `api-tokens.ts` already states for this codebase.
- **Never break the app.** Capture bookkeeping is wrapped so it can never throw
  into the caller; the original function is always called exactly once, with
  the same `this` and arguments, and its result/rejection is returned
  unchanged.
- **The recorder owns all policy.** Probes capture faithfully and stay dumb.
  Filtering, sampling, redaction, truncation and eviction all happen in one
  place (`core/recorder.ts`), on the way **into** the buffer — so the exported
  file can never contain something the policy removed.
- **Bounded memory.** Ring buffer of `maxEntries`; bodies truncated to
  `maxBodyLength`; log arguments cloned to JSON-safe values at record time
  (no live object references kept).
- **Time is a dependency.** Probes stamp `t` from an injected `Clock`; no
  inline `Date.now()` outside `core/clock.ts`.
- **Nothing in `src/debug-capture/` calls `console.*`** (except the console
  probe calling the originals, and the React adapter reproducing React's own
  default `console.error` for caught errors). A debug tool that logs would
  record itself.
- **Lean.** This ships in the production bundle. Current initial total is
  800.5 kB against an 850 kB warning budget. Target: the whole layer under
  15 kB raw.

## Code standards

- TypeScript `strict` plus this repo's flags: `noImplicitOverride`,
  `noPropertyAccessFromIndexSignature` (use `headers['x']`, not `headers.x`),
  `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- `lib` is `es2020` + `dom`: no `Array.prototype.at`, `Object.hasOwn`,
  `String.prototype.replaceAll`.
- TypeScript is `~5.1.6`: no `using` / `Symbol.dispose` (5.2+).
- Single quotes, 2-space indent (`.editorconfig`).
- No `any`. `unknown` at boundaries, narrowed explicitly.
- Doc comments explain **why**, matching the existing codebase.
- Specs next to the code (`x.ts` + `x.spec.ts`), Jasmine. Framework-free
  layers use no `TestBed`.
- Barrels export **public names only**. Module-internal helpers stay
  unexported from the barrel (they flow all the way to the public API).
- Conventional commits, scope `debug-capture`:
  `feat(debug-capture): …`, `test(debug-capture): …`, `docs(debug-capture): …`.

## PRs

| PR | Branch | Wave | Depends on | Owns (only these paths) |
|---|---|---|---|---|
| 1 | `claude/dc-01-foundation` | 1 | — | `src/debug-capture/**` (contract + all skeleton barrels), `src/app/features/debug-capture/index.ts`, `scripts/check-debug-capture-layers.js`, `package.json` (one script), `docs/intent/debug-capture.md` |
| 2 | `claude/dc-02-core` | 2 | 1 | `src/debug-capture/core/**` |
| 3 | `claude/dc-03-probes-console-errors` | 2 | 1 | `src/debug-capture/adapters/probes/console/**`, `…/probes/global-error/**` |
| 4 | `claude/dc-04-probes-http` | 2 | 1 | `src/debug-capture/adapters/probes/http/**` |
| 5 | `claude/dc-05-probe-websocket` | 2 | 1 | `src/debug-capture/adapters/probes/websocket/**` |
| 6 | `claude/dc-06-sinks` | 2 | 1 | `src/debug-capture/adapters/sinks/**` |
| 7 | `claude/dc-07-angular` | 2 | 1 | `src/app/features/debug-capture/**` |
| 8 | `claude/dc-08-install-wiring` | 3 | 2–7 | `src/debug-capture/install/**`, `src/main.ts`, `src/app/app.module.ts`, `src/debug-capture/README.md`, `README.md` |

```
            ┌── PR2 core ───────────┐
            ├── PR3 console+errors ─┤
PR1 ────────┼── PR4 xhr+fetch ──────┼──── PR8 install + wiring
foundation  ├── PR5 websocket ──────┤
            ├── PR6 sinks ──────────┤
            └── PR7 angular ────────┘
```

Wave 2 is fully parallel because every wave-2 PR codes against the
**contract** (merged in PR 1), not against each other. Probes need a
`Recorder` — they get the interface from the contract and use an inline fake
in specs. Sinks take plain strings, so they don't need the serializer. The
Angular layer needs only `CaptureSession`, which is in the contract.

No two PRs touch the same file. PR 1 pre-creates every barrel, including one
empty `index.ts` per probe module, so wave-2 PRs each edit only their own.

## Process

1. Orchestrator commits the plans on the integration branch and pushes.
2. Per PR: orchestrator creates a worktree + branch from the integration
   branch; an agent implements it from its plan, test-first, runs the
   verification below, commits and pushes; orchestrator opens the PR, reviews
   the diff, re-runs the checks on the PR head, and merges (merge commit,
   matching repo history).
3. Wave 3 starts after all wave-2 PRs are merged.
4. Final: fresh-context review of the whole integration branch, full suite,
   layer check, production build. Findings fixed in a follow-up PR into the
   same branch.

### Verification (every PR, from the worktree root)

```bash
npx tsc -p tsconfig.spec.json --noEmit     # type-checks all specs + what they import
npx tsc -p tsconfig.app.json --noEmit      # type-checks what main.ts reaches
npm run lint:layers                        # from PR 1 on
<run-tests.sh> --include '<this PR's spec glob>'
<run-tests.sh>                             # full suite: baseline 285 + new, all green
```

PR 8 additionally runs `npx ng build` and reports the initial-total delta.

### Definition of done (per PR)

- Every required spec in the PR plan exists and passes.
- Full suite green; both type-checks clean; layer check clean.
- Only the PR's owned paths changed.
- No `console.*`, no `any`, no inline `Date.now()` outside `core/clock.ts`.
- Public API matches the PR plan's signatures exactly (other PRs depend on
  the names).

## Status

All PRs merged into `claude/air-gapped-debug-logging-zkn1nr` (merge commits).

| PR | Scope | GitHub |
|---|---|---|
| 1 | contract, layer barrels, `lint:layers`, ADR | #34 |
| 2 | core: recorder, policy, redaction, ring buffer, serializer | #40 |
| 3 | probes: console, global errors | #38 |
| 4 | probes: XHR, fetch | #39 |
| 5 | probe: WebSocket | #37 |
| 6 | sinks: download, clipboard | #36 |
| 7 | Angular seam: token, ErrorHandler, providers | #35 |
| 8 | install layer + `main.ts` / `AppModule` wiring, README | #41 |
| 9 | review fixes — core: clone budget, redaction gaps, deep freeze | #43 |
| 10 | review fixes — probes: reused XHR, zone cost, dispose, fetch bodies | #42 |
| 12 | confirmation-review fixes: stack leak, URL params, hot path | #44 |
| 13 | stable wall-clock test guards | #45 |
| 14 | this status update | — |
| 15 | React adapter (L6 react, React-free) | — |

(There is no PR 11 — the number was reserved for this closing update and
re-used as 14 after PRs 12–13 were needed.)

### How it was verified

- **Per PR:** the orchestrator re-ran both type-checks, `lint:layers`, the
  PR's focused specs and the full suite on the pushed head, checked scope
  (only owned paths changed) and read the diff before merging.
- **Combined:** after each wave the merged branch was re-verified as a whole.
- **Independent review:** a fresh-context reviewer read the whole layer after
  wave 2 and found 2 blockers + 4 should-fix issues (fixed in PRs 9–10). A
  second pass confirmed them fixed and found more (fixed in PR 12); it then
  confirmed PR 12 and called it OK to merge.
- **Real browser, end to end:** Playwright against the served app (Node
  server for WebSocket traffic, zone.js loaded, real globals): 18/18 checks —
  flag off leaves `fetch` / `XMLHttpRequest` / `WebSocket` native; flag on
  captures HttpClient XHR, fetch, console and a real WebSocket round-trip, and
  redacts the login password, a token in a WebSocket URL, a bearer token in a
  logged `Map` and a suffix-matched `newPassword`.
- **Final numbers:** 578 specs (285 before this feature), all green across
  repeated runs; production initial bundle 829.64 kB (+29.1 kB raw, about
  +9 kB transferred) — under the 850 kB warning.

### Deviations from this plan

- **Bundle:** the layer is ~29 kB raw, not the 15 kB target. Still inside the
  budget; trimming it is a follow-up.
- **Redaction grew** beyond the original contract defaults: keys are
  normalised and matched by suffix, URL query parameters / form bodies /
  stacks / Maps / `{name, value}` pairs are redacted, headers also match
  secret names. See `docs/intent/debug-capture.md` §4.
- **Rule (b)** of the import rules is limited to child barrels of the same
  layer (as first written it let `src/debug-capture/index.ts` skip layers).

### Follow-ups (not done)

- On-screen panel (Network / Socket / Console) — the recorder's `onEntry()` is
  the seam; listeners for network entries run outside Angular's zone.
- Trim bundle weight (largest: `json-safe`, the XHR probe, the recorder).
- Binary WebSocket frames are base64-encoded before `sample()` runs.
- Not redacted by default: non-JSON text frames (socket.io, STOMP), NDJSON,
  free-text error messages, OAuth `code` parameters (see README limitations).
