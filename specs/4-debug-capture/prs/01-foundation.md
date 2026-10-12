# PR 1 — Foundation: contract, barrels, layer checker, ADR

**Branch:** `claude/dc-01-foundation` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 1 (blocks every other PR)
**Read first:** `specs/4-debug-capture/plan.md` (layers, import rules, standards)

## Goal

Lay down everything the six parallel wave-2 PRs code against: the complete
contract (types + constants), every layer's barrel as a valid skeleton, the
script that enforces the import rules, and the decision record.

## Owned paths (touch nothing else)

```
src/debug-capture/contract/capture-contract.ts
src/debug-capture/contract/capture-contract.spec.ts
src/debug-capture/contract/index.ts
src/debug-capture/core/index.ts
src/debug-capture/adapters/index.ts
src/debug-capture/adapters/probes/index.ts
src/debug-capture/adapters/probes/console/index.ts
src/debug-capture/adapters/probes/global-error/index.ts
src/debug-capture/adapters/probes/http/index.ts
src/debug-capture/adapters/probes/websocket/index.ts
src/debug-capture/adapters/sinks/index.ts
src/debug-capture/install/index.ts
src/debug-capture/index.ts
src/debug-capture/public-api.spec.ts
src/app/features/debug-capture/index.ts
src/app/features/debug-capture/public-api.spec.ts
scripts/check-debug-capture-layers.js
package.json                      (add ONE script: "lint:layers")
docs/intent/debug-capture.md
```

## 1. The contract — transcribe exactly

`src/debug-capture/contract/capture-contract.ts`. Names, fields and literal
types are load-bearing: six PRs implement against them in parallel. Keep the
doc comments; you may add to them, not change meaning.

```ts
/**
 * The whole shared vocabulary of the debug-capture layer. Every other layer
 * builds on these types; nothing here has behavior beyond a few frozen
 * constants. A change here is a change to every PR in
 * specs/4-debug-capture — update the plan with it.
 */

/** Bumped on any breaking change to the exported file shape. */
export const CAPTURE_SCHEMA_VERSION = 1;

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/** The console methods the console probe wraps, in a stable order. */
export const LOG_LEVELS: readonly LogLevel[] = Object.freeze(['log', 'info', 'warn', 'error', 'debug']);

/** What survives JSON.stringify unchanged — the shape stored entries use. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

/** Header name → value. Keys are always lower-case. */
export type HeaderMap = Readonly<Record<string, string>>;

export interface CaptureEntryBase {
  /** Assigned by the recorder: 1-based, strictly increasing, never reused — not even after clear(). */
  readonly seq: number;
  /** Epoch milliseconds of the event, stamped by the probe from the injected Clock. */
  readonly t: number;
}

export interface LogEntry extends CaptureEntryBase {
  readonly kind: 'log';
  readonly level: LogLevel;
  /** JSON-safe clones made at record time — never live references. */
  readonly args: readonly JsonValue[];
}

/** One entry per completed request (load, error, abort or timeout). */
export interface HttpEntry extends CaptureEntryBase {
  readonly kind: 'http';
  readonly transport: 'xhr' | 'fetch';
  /** Upper-case. */
  readonly method: string;
  /** Absolute URL. */
  readonly url: string;
  /** `null` when no HTTP response arrived (network error, abort, timeout). */
  readonly status: number | null;
  readonly durationMs: number | null;
  readonly reqHeaders: HeaderMap;
  readonly resHeaders: HeaderMap;
  /** Text bodies as-is; non-text bodies as a short descriptor such as `[Blob 512 bytes]`. */
  readonly reqBody: string | null;
  readonly resBody: string | null;
  /** Response size in bytes when known. */
  readonly bytes: number | null;
  readonly error: 'abort' | 'timeout' | 'network' | null;
}

export type WebSocketEvent = 'open' | 'send' | 'receive' | 'close' | 'error';

/** One entry per socket event; `socketId` groups the frames of one connection. */
export interface WebSocketEntry extends CaptureEntryBase {
  readonly kind: 'ws';
  /** 1-based per probe install, in creation order. */
  readonly socketId: number;
  readonly url: string;
  readonly event: WebSocketEvent;
  /** `send` / `receive` only; otherwise `null`. */
  readonly opcode: 'text' | 'binary' | null;
  /** Payload size in bytes (`send` / `receive`), otherwise `null`. */
  readonly bytes: number | null;
  /** Text frames as-is, binary frames base64, `close` → the reason (or `null`). */
  readonly data: string | null;
  /** `close` only: the close code. */
  readonly code: number | null;
}

export interface ErrorEntry extends CaptureEntryBase {
  readonly kind: 'error';
  /** `capture` = the debug-capture layer reporting its own failure (e.g. a probe that would not install). */
  readonly source: 'window' | 'unhandledrejection' | 'angular' | 'capture';
  readonly message: string;
  readonly stack: string | null;
}

/** Discriminated on `kind`. Switch over it with a `never` default to stay exhaustive. */
export type CaptureEntry = LogEntry | HttpEntry | WebSocketEntry | ErrorEntry;

export type CaptureKind = CaptureEntry['kind'];

/**
 * What a probe hands to the recorder: an entry without `seq` (the recorder
 * assigns it). Log arguments are still raw here — the recorder turns them
 * into JSON-safe values.
 */
export type EntryDraft =
  | (Omit<LogEntry, 'seq' | 'args'> & { readonly args: readonly unknown[] })
  | Omit<HttpEntry, 'seq'>
  | Omit<WebSocketEntry, 'seq'>
  | Omit<ErrorEntry, 'seq'>;

/**
 * Every rule about what gets kept and how, in one reviewable place. Applied
 * by the recorder on the way INTO the buffer — so an exported file can never
 * hold anything the policy removed.
 */
export interface CapturePolicy {
  /** Ring-buffer size; the oldest entry is evicted beyond it. Integer ≥ 1. */
  readonly maxEntries: number;
  /** Bodies, frame data, messages and stacks longer than this are truncated with a marker. Integer ≥ 0. */
  readonly maxBodyLength: number;
  /** How deep log arguments are cloned before collapsing to a placeholder. Integer ≥ 0. */
  readonly maxArgDepth: number;
  /** Header names (case-insensitive) whose values are replaced by `redactedValue`. */
  readonly redactHeaders: readonly string[];
  /**
   * Object keys (case-insensitive) whose values are replaced by
   * `redactedValue` anywhere inside JSON bodies, JSON text frames and logged
   * objects — e.g. the `password` in this app's login request.
   */
  readonly redactJsonKeys: readonly string[];
  /** Requests/sockets whose URL matches: every body / frame is replaced whole. */
  readonly redactBodyUrls: readonly RegExp[];
  readonly redactedValue: string;
  /** Requests/sockets whose URL matches are not recorded at all (counted as dropped). */
  readonly ignoreUrls: readonly RegExp[];
  /** Return `false` to drop a draft. The valve for very chatty sockets. */
  readonly sample?: (draft: EntryDraft) => boolean;
}

export const DEFAULT_CAPTURE_POLICY: CapturePolicy = Object.freeze({
  maxEntries: 5000,
  maxBodyLength: 32_768,
  maxArgDepth: 6,
  redactHeaders: Object.freeze([
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
  ]),
  redactJsonKeys: Object.freeze([
    'password',
    'passwd',
    'secret',
    'token',
    'accesstoken',
    'refreshtoken',
    'apikey',
    'authorization',
  ]),
  redactBodyUrls: Object.freeze([]),
  redactedValue: '[redacted]',
  ignoreUrls: Object.freeze([]),
});

/** Injected wherever time is read, so specs control it. */
export interface Clock {
  /** Epoch milliseconds. */
  now(): number;
}

export interface CaptureStats {
  /** Entries accepted into the buffer since the last clear(). */
  readonly recorded: number;
  /** Drafts rejected by `ignoreUrls` or `sample`. */
  readonly dropped: number;
  /** Entries pushed out of the full ring buffer. */
  readonly evicted: number;
  /** Drafts that threw while being processed (swallowed — capture never throws). */
  readonly failed: number;
}

export type EntryListener = (entry: CaptureEntry) => void;
export type Unsubscribe = () => void;

export interface Recorder {
  /** Applies the policy and stores the entry. Never throws. */
  record(draft: EntryDraft): void;
  /** Oldest first. A new array each call. */
  snapshot(): readonly CaptureEntry[];
  /** Empties the buffer and zeroes the stats. `seq` keeps counting. */
  clear(): void;
  /** A fresh copy each call. */
  stats(): CaptureStats;
  /** Called after each stored entry. A throwing listener is isolated. */
  onEntry(listener: EntryListener): Unsubscribe;
}

/** One installed patch on one global. */
export interface Probe {
  readonly name: string;
  /**
   * Restores the original global. Idempotent. After dispose nothing more is
   * recorded — including from requests/sockets already in flight.
   */
  dispose(): void;
}

/** The exported file. */
export interface CaptureFile {
  readonly schemaVersion: typeof CAPTURE_SCHEMA_VERSION;
  /** ISO-8601. */
  readonly capturedAt: string;
  /** `location.href` at export time. */
  readonly page: string;
  readonly userAgent: string;
  readonly stats: CaptureStats;
  readonly entries: readonly CaptureEntry[];
}

/** Chords like `ctrl+alt+shift+d`. Matched on `KeyboardEvent.code`, so keyboard layout does not matter. */
export interface ShortcutConfig {
  readonly download: string;
  readonly copy: string;
  readonly clear: string;
}

/** Three modifiers, to stay clear of browser and OS shortcuts (Ctrl+Shift+D bookmarks all tabs in Chrome). */
export const DEFAULT_SHORTCUTS: ShortcutConfig = Object.freeze({
  download: 'ctrl+alt+shift+d',
  copy: 'ctrl+alt+shift+c',
  clear: 'ctrl+alt+shift+x',
});

export interface DebugCaptureOptions {
  readonly policy?: Partial<CapturePolicy>;
  /** `false` disables keyboard shortcuts. */
  readonly shortcuts?: Partial<ShortcutConfig> | false;
}

/** What installDebugCapture() returns — the handle the app and the Angular layer hold. */
export interface CaptureSession {
  readonly recorder: Recorder;
  readonly clock: Clock;
  /** `false` after dispose(). */
  readonly active: boolean;
  /** The whole buffer as a CaptureFile, serialized. */
  toJson(): string;
  /** Saves toJson() as a file. */
  download(filename?: string): void;
  /** Copies toJson() to the clipboard. Resolves `false` instead of rejecting. */
  copy(): Promise<boolean>;
  clear(): void;
  /** Disposes every probe and shortcut. Globals are genuinely restored. Idempotent. */
  dispose(): void;
}
```

## 2. Skeleton barrels — exact contents

Each layer's barrel re-exports the full public API of the layer above. Wave-2
PRs append their own exports to the barrel they own; nobody else edits it.

| File | Content |
|---|---|
| `contract/index.ts` | `export * from './capture-contract';` |
| `core/index.ts` | `export * from '../contract';` |
| `adapters/index.ts` | `export * from '../core';`<br>`export * from './probes';`<br>`export * from './sinks';` |
| `adapters/probes/index.ts` | `export * from './console';`<br>`export * from './global-error';`<br>`export * from './http';`<br>`export * from './websocket';` |
| `adapters/probes/{console,global-error,http,websocket}/index.ts` | `export {};` |
| `adapters/sinks/index.ts` | `export {};` |
| `install/index.ts` | `export * from '../adapters';` |
| `src/debug-capture/index.ts` | `export * from './install';` |
| `src/app/features/debug-capture/index.ts` | `export * from '../../../debug-capture';` |

Give every barrel a 2–4 line header comment saying which layer it is and what
it may import (see the master plan's rules).

## 3. Layer checker — `scripts/check-debug-capture-layers.js`

Plain Node (CommonJS), no new dependencies. Use the `typescript` package
already in `node_modules` — `ts.preProcessFile(text, true, true)` returns
static imports, `export … from`, and dynamic `import()` specifiers without
fooling itself on comments or strings. Match the header-comment style of
`scripts/swap-domain-terms.js`.

Implements the seven rules in `plan.md` → *Import rules*:

- Walk every `.ts` file under `src/`.
- Classify each file: `contract` (L1), `core` (L2), `adapters` (L3, any
  depth), `install` (L4), `public` (L5 — files directly in
  `src/debug-capture/`), `angular` (L6 — under
  `src/app/features/debug-capture/`), or `consumer` (anything else). A `.ts`
  file under `src/debug-capture/` that fits no layer is itself an error.
- Resolve each relative specifier against the importing file: `<p>.ts`, or
  `<p>/index.ts` when `<p>` is a directory.
- For L1–L6 files, a relative import is allowed only if it is (a) in the same
  directory, (b) from an `index.ts`, the `index.ts` of an immediate child
  directory, or (c) the `index.ts` of the layer directly above
  (L2→contract, L3→core, L4→adapters, L5→install, L6→`src/debug-capture`).
- Package imports: forbidden in L1–L5; L6 allows `@angular/*`, `rxjs`,
  `rxjs/*`; consumers unrestricted.
- Consumers: a relative import that lands inside `src/debug-capture/` or
  `src/app/features/debug-capture/` must resolve to one of the two barrels.
- Also fail if any layer barrel is missing.
- Output: one line per violation —
  `src/…/x.ts: imports '../../core/recorder' — L3 may only import the core barrel (rule 3)`
  — then a count; exit code 1. Clean run prints one `ok` line, exit 0.
- Structure it as a pure `checkImport(...)` function plus a thin file-walking
  `main()`. `node scripts/check-debug-capture-layers.js --self-test` runs a
  table of cases against `checkImport` (no file system) and exits non-zero on
  any mismatch. Required self-test cases:
  - core file → `../contract` ✔
  - core file → `../contract/capture-contract` ✘ (deep)
  - adapters/probes/http file → `../../../core` ✔
  - adapters/probes/http file → `../../../contract` ✘ (two layers up)
  - adapters/probes/http file → `../websocket` ✘ (sibling module)
  - adapters/probes/index.ts → `./http` ✔ (child barrel)
  - adapters/probes/http/xhr.probe.ts → `./headers` ✔ (same dir)
  - install file → `../adapters` ✔ ; → `../core` ✘
  - core file → `rxjs` ✘ ; → `@angular/core` ✘
  - angular file → `@angular/core` ✔ ; → `../../../debug-capture` ✔ ;
    → `../../../debug-capture/core` ✘
  - consumer `src/main.ts` → `./app/features/debug-capture` ✔ ;
    → `./debug-capture/core` ✘

Add to `package.json` scripts: `"lint:layers": "node scripts/check-debug-capture-layers.js"`.
No other `package.json` change.

## 4. Specs

`src/debug-capture/contract/capture-contract.spec.ts`
- `CAPTURE_SCHEMA_VERSION is 1`
- `LOG_LEVELS lists the five console methods in order`
- `DEFAULT_CAPTURE_POLICY has the documented defaults` (every field)
- `DEFAULT_CAPTURE_POLICY and its arrays are frozen`
- `DEFAULT_SHORTCUTS uses three-modifier chords`
- `EntryDraft accepts one draft of each kind` — build one literal per kind
  typed as `EntryDraft` and switch over `kind` with a `never` default; this
  is mostly a compile-time guard.

`src/debug-capture/public-api.spec.ts` (imports `./index`)
- `re-exports the contract through every layer` — `DEFAULT_CAPTURE_POLICY`,
  `CAPTURE_SCHEMA_VERSION`, `DEFAULT_SHORTCUTS` are reachable.

`src/app/features/debug-capture/public-api.spec.ts` (imports `./index`)
- same check through the Angular barrel.

## 5. ADR — `docs/intent/debug-capture.md`

Follow the shape of `docs/intent/login-authentication.md` (Status / For /
Context header, numbered sections). Status: *Accepted 2026-10-12*. Content —
use these facts, they were verified against the published packages:

1. **What we're building** — the capture layer (scope/out-of-scope from
   `plan.md`). Environment: air-gapped, no DevTools, needs to work in
   production builds behind a flag (`?debug=1` or localStorage
   `debug-capture=1`, wired in PR 8).
2. **Alternatives considered**
   - *eruda 3.4.3* (MIT, 21k★): 488 kB raw / 147 kB gzip. Bundles chobitsu,
     which patches XHR, fetch and WebSocket at load and never restores them
     (no restore/unpatch code at all); keeps every response body in a
     module-private `Map` that is set but never deleted; its own pre-enable
     buffer is an unbounded array. Captures WebSocket frames but its Network
     panel never displays them. No bulk export. Ships no LICENSE file in the
     npm package.
   - *vConsole 3.15.1* (MIT, Tencent): 280 kB raw / 76 kB gzip. Can restore
     its patches (`unMock()`), bounds memory (`maxNetworkNumber`, default
     1000). But zero WebSocket capture, no bulk export, and no release since
     2023-06-01 (issue #718 "has maintenance stopped?" closed without an
     answer).
   - *chii* (MIT): real Chrome DevTools frontend over a relay server — but
     an unauthenticated relay is remote code execution in the user's session.
     Dev boxes only.
   - Decision: build the capture layer ourselves. It is needed under every
     option (redaction, bounded memory, real on/off and export are impossible
     on a capture you don't own). The on-screen panel is a separate, later
     decision.
3. **Architecture** — the layer diagram and import rules from `plan.md`, and
   why: portability (copy `src/debug-capture/` into any project, no Angular
   needed), one auditable place touching globals, enforced by
   `npm run lint:layers`.
4. **Security** — redaction happens before storage, never at display.
   Default redactions: auth/cookie/API-key headers; JSON keys such as
   `password` and `token` anywhere in bodies, frames and logged objects. Note
   that this app's login request body `{ username, password, mode, position }`
   is covered by the `password` key. Exported files may still contain
   business data — treat them as sensitive.
5. **Memory and performance** — ring buffer (5000 default), body truncation
   (32 KiB default), JSON-safe cloning of log args (no live references),
   optional `sample()` for chatty sockets (the system-experiments grid
   streams many frames per second). No sampling by default.
6. **Known limitations** — requests are recorded on completion (a request
   that never finishes does not appear); sockets created before install are
   not captured; streaming response bodies (`text/event-stream`) and binary
   fetch bodies are not read; pages that load before the flag is set capture
   nothing.

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
node scripts/check-debug-capture-layers.js --self-test
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/**/*.spec.ts' --include 'src/app/features/debug-capture/**/*.spec.ts'
<run-tests.sh>
```

Also prove the checker bites: temporarily add a deep import to a core file,
confirm `npm run lint:layers` fails with a readable message, then revert.
Mention it in your report.

## Out of scope

Any implementation in core/adapters/install/angular beyond the skeleton
barrels.
