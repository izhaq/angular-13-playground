# PR 3 — Probes: console and global errors

**Branch:** `claude/dc-03-probes-console-errors` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 2 (parallel with PRs 2, 4–7) · **Depends on:** PR 1
**Read first:** `specs/4-debug-capture/plan.md` (*Design rules*), the contract.

## Goal

Record every `console.log/info/warn/error/debug` call and every uncaught
error / unhandled promise rejection — without changing what the app or the
browser does.

## Owned paths

```
src/debug-capture/adapters/probes/console/console.probe.ts
src/debug-capture/adapters/probes/console/console.probe.spec.ts
src/debug-capture/adapters/probes/console/index.ts
src/debug-capture/adapters/probes/global-error/global-error.probe.ts
src/debug-capture/adapters/probes/global-error/global-error.probe.spec.ts
src/debug-capture/adapters/probes/global-error/index.ts
```

Imports: files in the same directory, and the core barrel
(`'../../../core'`) for contract types (`Recorder`, `Clock`, `Probe`,
`LogLevel`, `LOG_LEVELS`, `EntryDraft`). PR 2 (core implementation) is being
built in parallel — **do not depend on any core function**, only on contract
types re-exported through the core barrel. Specs use an inline fake
`Recorder` that pushes drafts into an array, and a fake `Clock`.

## Public API — exact names (PR 8 imports these)

```ts
// console/console.probe.ts
export type ConsoleHost = Pick<Console, LogLevel>;
export function installConsoleProbe(recorder: Recorder, clock: Clock, host?: ConsoleHost): Probe;
//   host defaults to globalThis.console. Probe.name === 'console'.

// global-error/global-error.probe.ts
export interface ErrorEventHost {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}
export function installGlobalErrorProbe(recorder: Recorder, clock: Clock, host?: ErrorEventHost): Probe;
//   host defaults to globalThis (window). Probe.name === 'global-error'.
```

Each module's `index.ts` exports exactly its public names above.

## Behavior — console probe

- For each level in `LOG_LEVELS`, replace `host[level]` with a wrapper that:
  1. records `{ kind: 'log', level, t: clock.now(), args }` — `args` is the
     raw argument array (the recorder clones it);
  2. calls the original **exactly once** with the same `this` and arguments
     and returns its return value.
- Recording is guarded: if `recorder.record` or `clock.now` throws, the
  original is still called and nothing propagates.
- **Re-entrancy guard.** A recorder listener (or anything during `record`)
  that calls `console.*` must not be recorded again — otherwise one log line
  becomes infinite recursion. While inside the wrapper's recording step,
  nested calls go straight to the original.
- `dispose()`: for each level, if `host[level]` is still our wrapper, restore
  the original; if someone else wrapped it after us, leave theirs in place
  and make ours a pass-through. Idempotent. After dispose, nothing records.
- Never call `console.*` yourself.

## Behavior — global-error probe

- Listen (bubble phase) for `'error'` and `'unhandledrejection'` on `host`.
- `'error'`, when the event is an `ErrorEvent`:
  - `message` = `event.message` (fallback `String(event.error)`), with
    `" (filename:lineno:colno)"` appended when `filename` is present;
  - `stack` = `event.error?.stack` when it is a string, else `null`;
  - `source: 'window'`.
  A non-`ErrorEvent` `'error'` event records `message: '[error event]'`,
  `stack: null`.
- `'unhandledrejection'`: read `event.reason` —
  `Error` → its `message` / `stack`; string → itself; anything else →
  `JSON.stringify` it (fallback `String(reason)`), `stack: null`;
  `source: 'unhandledrejection'`.
- Never call `preventDefault()` / `stopPropagation()` — the browser and the
  app must behave exactly as before.
- Guarded: a failure while building the entry is swallowed.
- `dispose()` removes both listeners; idempotent; nothing records after.
- `t` from `clock.now()`.

## Required specs

`console.probe.spec.ts` (fake host = plain object with five spy methods)
- `records each level with its raw args and the clock time`
- `calls the original once with the same this and args`
- `returns the original's return value`
- `still calls the original when recording throws`
- `does not re-record console calls made while recording`
- `restores every original on dispose`
- `dispose is idempotent`
- `becomes a pass-through when wrapped again by someone else`
- `records nothing after dispose`

`global-error.probe.spec.ts` (fake host = a real `EventTarget` instance;
dispatch real `ErrorEvent` / `PromiseRejectionEvent` objects —
`new PromiseRejectionEvent('unhandledrejection', { promise, reason })` works
in Chrome; attach a no-op `.catch` to the promise you pass)
- `records an ErrorEvent with location appended`
- `uses the error's stack when present`
- `records a non-ErrorEvent error generically`
- `records an Error rejection reason with its stack`
- `records string and object rejection reasons`
- `does not prevent default or stop propagation`
- `removes both listeners on dispose and records nothing after`
- `dispose is idempotent`

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/adapters/probes/console/**/*.spec.ts' --include 'src/debug-capture/adapters/probes/global-error/**/*.spec.ts'
<run-tests.sh>
```

## Out of scope

Patching the real `window.console` or `window` in specs — always fake hosts.
