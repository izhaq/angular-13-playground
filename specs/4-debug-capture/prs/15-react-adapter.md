# PR 15 — React adapter (framework seam for React apps)

**Branch:** `claude/dc-15-react-adapter` → base `claude/air-gapped-debug-logging-zkn1nr`
**Depends on:** PRs 1–14 (all merged)
**Read first:** `specs/4-debug-capture/plan.md` (layers, rules), the Angular
seam in `src/app/features/debug-capture/` (the model to mirror), the contract.

## Goal

The capture layer is framework-free, so in a React app it already records
console, window errors, unhandled rejections, XHR, fetch and WebSocket. What
it misses is what Angular's `ErrorHandler` seam gives the Angular app: a
structured `ErrorEntry` for errors **React** handles itself, with React's
**component stack** (which component broke).

This repo has no React dependency and must not get one. The adapter is
therefore **React-shaped but React-free**: plain functions with exactly the
callback signatures React calls. No `react` import, no new package.

## React's API — verified, do not guess

From `@types/react-dom@19.3.0` (`client.d.ts`), `createRoot(el, options)`:

```ts
interface RootOptions {
  onUncaughtError?: (error: unknown, errorInfo: { componentStack?: string | undefined }) => void;
  onRecoverableError?: (error: unknown, errorInfo: { componentStack?: string }) => void;
  onCaughtError?: (
    error: unknown,
    errorInfo: { componentStack?: string | undefined; errorBoundary?: React.Component<unknown> | undefined },
  ) => void;
}
```

React's **defaults** when these are not given — from `react-dom@19.3.0`
`cjs/react-dom-client.production.js`:

```js
function defaultOnUncaughtError(error)   { reportGlobalError(error); }
function defaultOnCaughtError(error)     { console.error(error); }
function defaultOnRecoverableError(error){ reportGlobalError(error); }
// reportGlobalError = typeof reportError === 'function' ? reportError
//   : dispatch `new window.ErrorEvent('error', { bubbles, cancelable, message, error })` on window
```

React 18 has no root options; errors are observed in an error boundary's
`componentDidCatch(error, errorInfo)` where `errorInfo.componentStack` is a
string.

## Owned paths

```
src/debug-capture/contract/capture-contract.ts        (ErrorEntry.source += 'react')
src/debug-capture/contract/capture-contract.spec.ts
src/debug-capture/react/react-error-handlers.ts       (new)
src/debug-capture/react/react-error-handlers.spec.ts  (new)
src/debug-capture/react/index.ts                      (new barrel)
scripts/check-debug-capture-layers.js                 (new layer)
src/debug-capture/README.md                           (React section)
docs/intent/debug-capture.md                          (short section)
specs/4-debug-capture/plan.md                         (layer diagram, rule 7, PR table row)
```

## Layering

New layer **L6 react** at `src/debug-capture/react/` — a sibling of the
Angular seam (both sit on L5), kept inside `src/debug-capture/` so copying
that one folder into a React project brings it along.

- Imports: same-directory files and the **L5 public barrel** (`'..'`). No
  packages (rule 5 applies — it is under `src/debug-capture/`).
- The L5 barrel must **not** re-export it (L5 may not import a layer below).
- Consumers may import its barrel (`src/debug-capture/react`); add it to
  rule 7 / `CONSUMER_BARRELS`.
- Layer checker: classify `src/debug-capture/react/**` as `react` (L6,
  above = `public`). Self-test cases to add:
  - react file → `'..'` ✔
  - react file → `'../install'` ✘ (rule 4/3)
  - react file → `'react'` ✘ (rule 5)
  - `src/debug-capture/index.ts` → `'./react'` ✘
  - consumer → `'./debug-capture/react'` ✔ ; → `'./debug-capture/react/react-error-handlers'` ✘ (rule 7)

## Contract change

`ErrorEntry.source`: add `'react'`. Doc comment: "errors React handled itself
(root error callbacks or an error boundary), with React's component stack
appended to `stack`". No other shape change — the component stack goes into
`stack` (below), so the recorder, serializer and redaction need no change.

## Public API — exact names

```ts
/** What React passes as the second argument. */
export interface ReactErrorInfo {
  readonly componentStack?: string | null | undefined;
}

/** Matches React 19 `createRoot` / `hydrateRoot` RootOptions error callbacks. */
export interface ReactRootErrorOptions {
  onUncaughtError: (error: unknown, errorInfo: ReactErrorInfo) => void;
  onCaughtError: (error: unknown, errorInfo: ReactErrorInfo & { readonly errorBoundary?: unknown }) => void;
  onRecoverableError: (error: unknown, errorInfo: ReactErrorInfo) => void;
}

/** React's own default behaviour, injectable for specs. */
export interface ReactErrorDefaults {
  /** React's default for uncaught and recoverable errors (`reportError`). */
  reportError(error: unknown): void;
  /** React's default for caught errors (`console.error`). */
  logError(error: unknown): void;
}

export function createReactRootErrorOptions(
  session: CaptureSession | null,
  next?: Partial<ReactRootErrorOptions>,
  defaults?: ReactErrorDefaults,
): ReactRootErrorOptions;

/** For React 18 error boundaries: call from componentDidCatch. */
export function recordReactError(
  session: CaptureSession | null,
  error: unknown,
  errorInfo?: ReactErrorInfo,
  handling?: 'uncaught' | 'caught' | 'recoverable',   // default 'caught'
): void;
```

`index.ts` exports exactly these.

## Behavior

### Recording (`recordReactError`, shared by the three handlers)
- Only when `session?.active`. **Never throws** (guarded).
- `{ kind: 'error', source: 'react', t: session.clock.now(), message, stack }`.
- `message`: `Error` → `.message`; string → itself; else `JSON.stringify`
  with `String()` fallback (same rule as the Angular handler — a small
  duplicated helper, siblings can't share; say so in a comment).
- `stack`: the error's own stack (if a string), then — when React gave a
  component stack — a blank line and
  `React component stack (<uncaught | caught by an error boundary | recovered>):`
  followed by the component stack as React gave it. If the error has no stack,
  `stack` is just that section. No component stack and no error stack → `null`.
- The recorder already redacts and truncates `message` / `stack`.

### `createReactRootErrorOptions(session, next, defaults)`
Each of the three handlers:
1. records (guarded) with its handling kind;
2. **then** calls `next.<handler>(error, errorInfo)` if the app passed one,
   otherwise React's default (`defaults.reportError` for uncaught /
   recoverable, `defaults.logError` for caught) — so app behaviour is
   exactly what React would have done without us.
3. Step 2 is **not** wrapped: if the app's own handler throws, that must
   surface exactly as it would without the adapter.

`defaults` default:
- `reportError`: `globalThis.reportError` when it is a function; else
  React's fallback — dispatch `new ErrorEvent('error', { bubbles: true,
  cancelable: true, message, error })` on `window` when available; else
  rethrow on a timer (`setTimeout(() => { throw error; })`).
- `logError`: `globalThis.console.error(error)`. This is the **one** place
  this layer calls `console.*`, and only to reproduce React's own default;
  read it off `globalThis` at call time, and comment why.

Works with a `null` or inactive session: it then only delegates.

**Duplicates, by design** (document in README): with React's defaults kept,
an uncaught error is recorded as `react` (with component stack) **and** —
via `reportError` → window `error` event — as `window` by the global-error
probe; a caught one as `react` and as a `console.error` log line. Same
trade-off as the Angular seam: the `react` entry is the one with the
component stack.

## Specs (`react-error-handlers.spec.ts`; no React, no TestBed)

Fake session (recorder pushing drafts to an array, fake clock, `active`),
fake defaults (spies).

- `records an uncaught error with source react and the component stack`
- `labels caught and recovered errors in the stack section`
- `uses only the component stack when the error has no stack`
- `stack is null with neither stack nor component stack`
- `describes string and object errors`
- `calls React's default after recording (reportError / logError)`
- `calls the app's own handler instead of the default when given`
- `lets the app's own handler throw through unchanged`
- `still delegates when recording throws`
- `only delegates with a null or inactive session`
- `recordReactError defaults to caught and never throws`
- `the default reportError falls back to an ErrorEvent on window when reportError is missing`
  (pass a fake scope; never touch real globals)
- `returns exactly the three RootOptions callbacks`

Contract spec: `ErrorEntry source includes react` (compile-time literal).

## Docs

- **README** — a "Using it in a React app" section, plain words (root
  `CLAUDE.md`): install before `createRoot`; React 19 snippet:
  ```ts
  const session = isDebugRequested() ? installDebugCapture() : null;
  createRoot(el, { ...createReactRootErrorOptions(session) }).render(<App />);
  ```
  React 18 snippet: an `ErrorBoundary` whose `componentDidCatch` calls
  `recordReactError(session, error, info)`. Note the duplicates and that the
  network/console capture needs nothing React-specific.
- **ADR** — a short "React" subsection: React-shaped but React-free, why.
- **plan.md** — add L6 react to the diagram, update rule 7, add PR 15 to the
  status table.

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
node scripts/check-debug-capture-layers.js --self-test
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/react/**/*.spec.ts' --include 'src/debug-capture/contract/**/*.spec.ts'
<run-tests.sh>                     # baseline 578 SUCCESS
npx ng build                       # initial total must be unchanged (829.64 kB): nothing in the app imports react/
```

## Out of scope

Installing React or `@types/react`; any change to probes, core or the
Angular seam.
