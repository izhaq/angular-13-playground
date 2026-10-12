# PR 7 — Angular seam: session token, ErrorHandler, provider

**Branch:** `claude/dc-07-angular` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 2 (parallel with PRs 2–6) · **Depends on:** PR 1
**Read first:** `specs/4-debug-capture/plan.md`, the contract
(`CaptureSession`), and `src/app/features/auth/auth.providers.ts` for the
provider style this repo uses.

## Goal

The optional Angular layer (L6). It adds what the global probes cannot see —
errors that Angular catches itself (Angular's default `ErrorHandler` only
`console.error`s them, losing the structured stack) — and a DI token through
which the app reaches the session that `main.ts` creates before bootstrap.

## Owned paths

```
src/app/features/debug-capture/debug-capture.tokens.ts
src/app/features/debug-capture/debug-capture.error-handler.ts
src/app/features/debug-capture/debug-capture.error-handler.spec.ts
src/app/features/debug-capture/debug-capture.providers.ts
src/app/features/debug-capture/debug-capture.providers.spec.ts
src/app/features/debug-capture/index.ts      (append exports; keep the existing re-export line first)
```

Do **not** touch `public-api.spec.ts` (PR 1's), `main.ts` or `app.module.ts`
(PR 8 wires them).

Imports: `@angular/*`, same-directory files, and the public barrel
`'../../../debug-capture'` — for contract **types** only (`CaptureSession`).
The install layer (PR 8) does not exist yet; specs use an inline fake
session (fake recorder pushing drafts into an array + fake clock).

## Public API — exact names (PR 8 imports these)

```ts
// debug-capture.tokens.ts
export const DEBUG_CAPTURE_SESSION: InjectionToken<CaptureSession | null>;

// debug-capture.error-handler.ts
@Injectable()
export class DebugCaptureErrorHandler extends ErrorHandler { override handleError(error: unknown): void; }

// debug-capture.providers.ts
export function provideDebugCapture(): Provider[];
export function provideDebugCaptureSession(session: CaptureSession | null): StaticProvider;
```

`index.ts` appends `export * from` each of the three files.

## Behavior

### The token — a trap to avoid
`main.ts` (PR 8) provides the session at **platform** level:

```ts
platformBrowserDynamic([provideDebugCaptureSession(session)]).bootstrapModule(AppModule)
```

So the token must be declared **without** `providedIn` / `factory`:

```ts
export const DEBUG_CAPTURE_SESSION = new InjectionToken<CaptureSession | null>('DEBUG_CAPTURE_SESSION');
```

A `providedIn: 'root'` factory would be resolved by the root injector itself
and would **shadow** the platform value with its default — the session would
silently never arrive. Consumers inject it with `{ optional: true }`; absent
and `null` both mean "capture is off". Say this in the token's doc comment.

### `provideDebugCaptureSession(session)`
Returns `{ provide: DEBUG_CAPTURE_SESSION, useValue: session }`.

### `provideDebugCapture()`
Returns `[{ provide: ErrorHandler, useClass: DebugCaptureErrorHandler }]`.
Doc comment in the `provideAuth()` style: one call in the root providers;
safe when capture is off (the handler then only delegates).

### `DebugCaptureErrorHandler`
- `session = inject(DEBUG_CAPTURE_SESSION, { optional: true })`.
- `handleError(error)`:
  1. If `session?.active`, record (guarded — must never throw):
     `{ kind: 'error', source: 'angular', t: session.clock.now(), message, stack }`.
     Unwrap zone.js rejection wrappers: if `error` is an object with a
     `rejection` property, describe the rejection instead. `Error` →
     `message` / `stack`; string → itself; else `JSON.stringify` with
     `String()` fallback; `stack: null` when not a string.
  2. **Always** call `super.handleError(error)` — Angular's default behaviour
     (it `console.error`s) is unchanged. The console probe will also record
     that `console.error` line; the duplicate is intentional and cheap, the
     `angular` entry is the one with the structured stack.

## Specs (`TestBed`, as in `unauthorized.interceptor.spec.ts`)

`debug-capture.error-handler.spec.ts` — spy `console.error` to keep output
clean and to assert delegation.
- `records an Angular error with message, stack and clock time`
- `unwraps a zone rejection wrapper`
- `describes string and object errors`
- `still delegates to the default handler`
- `delegates without recording when no session is provided`
- `delegates without recording when the session is inactive`
- `never throws when recording fails`

`debug-capture.providers.spec.ts`
- `provideDebugCapture replaces the ErrorHandler`
- `provideDebugCaptureSession provides the given session`
- `the token has no root default` — `TestBed.inject(DEBUG_CAPTURE_SESSION, null)`
  is `null` with no provider (proves no factory shadows the platform value)

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/app/features/debug-capture/**/*.spec.ts'
<run-tests.sh>
```

## Out of scope

Wiring into `main.ts` / `AppModule`, any HTTP interceptor (see `plan.md` →
*Scope*), any UI.
