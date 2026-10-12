# PR 8 — Install layer (composition root) + app wiring

**Branch:** `claude/dc-08-install-wiring` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 3 · **Depends on:** PRs 2–7 all merged
**Read first:** `specs/4-debug-capture/plan.md`, then the merged code: core
(`src/debug-capture/core/index.ts`), probes, sinks, and the Angular layer.

## Goal

Wire everything together in the one place allowed to touch real globals, and
switch it on in the app behind a flag.

## Owned paths

```
src/debug-capture/install/environment.ts                 (real-browser hosts)
src/debug-capture/install/shortcuts.ts
src/debug-capture/install/shortcuts.spec.ts
src/debug-capture/install/debug-requested.ts
src/debug-capture/install/debug-requested.spec.ts
src/debug-capture/install/install-debug-capture.ts
src/debug-capture/install/install-debug-capture.spec.ts
src/debug-capture/install/index.ts                       (append exports; keep `export * from '../adapters';` first)
src/debug-capture/README.md
src/main.ts
src/app/app.module.ts
README.md                                                (one short section)
```

Imports inside `install/`: same-directory files and `'../adapters'` only.
`main.ts` and `app.module.ts` import only the Angular barrel
`'./app/features/debug-capture'` / `'./features/debug-capture'`.

## Public API — exact names

```ts
// environment.ts
export interface CaptureEnvironment {
  readonly clock: Clock;
  readonly console: ConsoleHost;
  readonly errors: ErrorEventHost;
  readonly xhr: XhrHost;
  readonly fetch: FetchHost;
  readonly webSocket: WebSocketHost;
  readonly download: DownloadHost;
  readonly clipboard: ClipboardHost;
  /** Where keyboard shortcuts are listened for. */
  readonly keyboard: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  readonly page: { readonly location: { readonly href: string }; readonly userAgent: string };
}
export function browserEnvironment(): CaptureEnvironment;   // the real window/document/navigator/systemClock

// shortcuts.ts
export function parseShortcut(spec: string): ((event: KeyboardEvent) => boolean) | null;
export function bindShortcuts(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  bindings: readonly (readonly [spec: string, action: () => void])[],
): () => void;

// debug-requested.ts
export const DEBUG_STORAGE_KEY = 'debug-capture';
export function isDebugRequested(
  location?: { readonly search: string },
  storage?: Pick<Storage, 'getItem'> | null,
): boolean;

// install-debug-capture.ts
export function installDebugCapture(options?: DebugCaptureOptions, env?: CaptureEnvironment): CaptureSession;
export function getActiveCaptureSession(): CaptureSession | null;
```

`install/index.ts` exports: `installDebugCapture`, `getActiveCaptureSession`,
`isDebugRequested`, `DEBUG_STORAGE_KEY`, `browserEnvironment`,
`CaptureEnvironment`. (`parseShortcut` / `bindShortcuts` stay internal.)

## Behavior

### `browserEnvironment()`
Builds every host from the real globals, lazily enough that nothing throws in
an odd environment. Defaults: `clock: systemClock`, `console: globalThis.console`,
`errors` / `keyboard`: `window`, `xhr` / `fetch` / `webSocket`: `globalThis`
(cast to the host types), `download`: `{ document, URL, defer: fn => setTimeout(fn, 0) }`,
`clipboard`: `{ navigator, document, isSecureContext }`, `page`:
`{ location, userAgent: navigator.userAgent }`.

### `parseShortcut(spec)` / `bindShortcuts`
- `'ctrl+alt+shift+d'` (case-insensitive, any modifier order; `meta`
  allowed). The key part: one letter → `KeyD`, one digit → `Digit1`.
  Anything else → `null`.
- Match on `event.code` and **exact** modifier state (all four checked), so
  `ctrl+alt+shift+d` does not fire on `ctrl+shift+d`. Layout-independent.
- `bindShortcuts` adds one `keydown` listener; on a match: `preventDefault()`,
  run the action (guarded — a throwing action must not break the page).
  Returns the unbind function. Invalid specs are skipped.

### `isDebugRequested(location, storage)`
`true` if the query string has `debug=1` or `debug=true`, or
`storage.getItem('debug-capture') === '1'`. Storage access in `try/catch`
(private windows / blocked storage throw) → treat as not set. Defaults:
`globalThis.location`, `globalThis.localStorage`.

### `installDebugCapture(options = {}, env = browserEnvironment())`
1. If a session is already active, return it (never patch twice).
2. `policy = resolvePolicy(options.policy)` — invalid limits throw here,
   before anything is patched.
3. `recorder = createRecorder(policy)`.
4. Install probes in this order, **each in its own `try/catch`**: console,
   global-error, xhr, fetch, websocket. A probe that fails to install is
   skipped and recorded as `{ kind: 'error', source: 'capture', message: 'probe <name> failed to install: …' }`;
   the others still install.
5. Unless `options.shortcuts === false`, bind
   `{ ...DEFAULT_SHORTCUTS, ...options.shortcuts }` → `download` /
   `copy` / `clear` on `env.keyboard`.
6. Return the session:
   - `toJson()` → `serializeCaptureFile(buildCaptureFile(recorder.snapshot(), recorder.stats(), { capturedAt: new Date(clock.now()).toISOString(), page: env.page.location.href, userAgent: env.page.userAgent }))`.
   - `download(filename = defaultCaptureFileName(new Date(clock.now())))` →
     `downloadText(toJson(), filename, 'application/json', env.download)`.
   - `copy()` → `copyText(toJson(), env.clipboard)`.
   - `clear()` → `recorder.clear()`.
   - `dispose()` → unbind shortcuts, dispose probes in **reverse** install
     order, `active = false`, forget the active session. Idempotent.
   - `active`, `recorder`, `clock` per the contract.

### `main.ts`
```ts
import {
  installDebugCapture,
  isDebugRequested,
  provideDebugCaptureSession,
} from './app/features/debug-capture';

// Installed before bootstrap so startup requests are captured, and so the
// capture survives a bootstrap failure (export still works by shortcut).
const debugCapture = isDebugRequested() ? installDebugCapture() : null;

platformBrowserDynamic([provideDebugCaptureSession(debugCapture)])
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
```
Keep the existing `enableProdMode()` block. Match the file's style.

### `app.module.ts`
Add `provideDebugCapture()` to `providers`, after `provideAuth()`, with a
one-line comment.

### `src/debug-capture/README.md`
Plain words (see the root `CLAUDE.md` "Explain Simply"): what it is; how to
turn it on (`?debug=1`, or `localStorage.setItem('debug-capture', '1')`); the
three shortcuts; what the file contains (one example entry per kind); the
layer diagram + import rule + `npm run lint:layers`; **how to port it to
another project** (copy `src/debug-capture/`, optionally
`src/app/features/debug-capture/`, call `installDebugCapture()` first thing);
policy options; known limitations (copy them from
`docs/intent/debug-capture.md`); "exported files can contain business data —
treat them as sensitive".

### Root `README.md`
A short "Debugging without DevTools" section pointing at the README above.

## Specs

`shortcuts.spec.ts`
- `parses letters and digits in any modifier order`
- `rejects malformed specs`
- `matches exact modifiers only`
- `runs the action and prevents default on match`
- `isolates a throwing action`
- `unbind removes the listener`

`debug-requested.spec.ts`
- `true for ?debug=1 and ?debug=true`
- `true when storage has debug-capture=1`
- `false otherwise`
- `false when storage throws`

`install-debug-capture.spec.ts` — a fake `CaptureEnvironment` built from fake
hosts (fake console object, an `EventTarget` for errors/keyboard, a
`class extends XMLHttpRequest {}` host, a `{ fetch: window.fetch.bind(window) }`
host, a fake WebSocket class, fake download/clipboard hosts, fake clock). The
real globals are never touched. Dispose in `afterEach`.
- `captures console, errors, xhr, fetch and websocket end to end`
- `redacts the login password before it reaches the export` — POST
  `{"username":"op","password":"s3cret",…}` through the xhr host; the
  password is absent from `toJson()`
- `toJson produces a schema-versioned file`
- `download and copy hand the JSON to the sinks`
- `shortcuts trigger download, copy and clear`
- `shortcuts: false binds nothing`
- `returns the active session instead of installing twice`
- `keeps going when one probe fails to install, and records why`
- `rejects an invalid policy before patching anything`
- `dispose restores every host and unbinds shortcuts`
- `can install again after dispose`

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit           # now reaches the whole layer via main.ts
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/install/**/*.spec.ts'
<run-tests.sh>
npx ng build                                     # report initial total; must stay under the 850 kB warning
```

Report the bundle delta against the 800.51 kB baseline.

The orchestrator runs a real-browser end-to-end smoke test (served app,
`?debug=1`, shortcut → downloaded file inspected) during final review; you do
not need to.

## Out of scope

Any UI panel. Any HTTP interceptor.
