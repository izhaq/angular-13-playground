# PR 2 — Core: recorder, policy, redaction, ring buffer, serializer

**Branch:** `claude/dc-02-core` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 2 (parallel with PRs 3–7) · **Depends on:** PR 1
**Read first:** `specs/4-debug-capture/plan.md`, then the contract in
`src/debug-capture/contract/capture-contract.ts`.

## Goal

All the pure logic. No globals, no DOM (except the one `instanceof Node`
check below), no timers. Everything here is deterministic and tested without
`TestBed`.

## Owned paths

`src/debug-capture/core/**` only. Imports: the contract barrel (`../contract`)
and files in `core/`. Nothing else.

```
core/clock.ts            core/clock.spec.ts
core/ring-buffer.ts      core/ring-buffer.spec.ts
core/json-safe.ts        core/json-safe.spec.ts
core/redact.ts           core/redact.spec.ts
core/truncate.ts         core/truncate.spec.ts
core/policy.ts           core/policy.spec.ts
core/recorder.ts         core/recorder.spec.ts
core/serializer.ts       core/serializer.spec.ts
core/index.ts            (append exports — keep `export * from '../contract';` first)
```

## Public API — exact names (PR 8 imports these)

```ts
// clock.ts
export const systemClock: Clock;                       // { now: () => Date.now() } — the ONLY Date.now() in the layer

// ring-buffer.ts
export class RingBuffer<T> {
  constructor(capacity: number);                       // RangeError unless integer ≥ 1
  readonly capacity: number;
  get size(): number;
  push(item: T): T | undefined;                        // returns the evicted item, if any
  toArray(): T[];                                      // oldest first, new array
  clear(): void;
}

// json-safe.ts
export function toJsonSafe(value: unknown, maxDepth: number): JsonValue;

// redact.ts
export function redactHeaders(headers: HeaderMap, names: readonly string[], replacement: string): HeaderMap;
export function redactJsonValue(value: JsonValue, keys: readonly string[], replacement: string): JsonValue;
export function redactJsonText(text: string, keys: readonly string[], replacement: string): string;
export function matchesAny(url: string, patterns: readonly RegExp[]): boolean;

// truncate.ts
export function truncate(text: string, max: number): string;

// policy.ts
export function resolvePolicy(overrides?: Partial<CapturePolicy>): CapturePolicy;

// recorder.ts
export function createRecorder(policy: CapturePolicy): Recorder;

// serializer.ts
export interface CaptureMeta { readonly capturedAt: string; readonly page: string; readonly userAgent: string; }
export function buildCaptureFile(entries: readonly CaptureEntry[], stats: CaptureStats, meta: CaptureMeta): CaptureFile;
export function serializeCaptureFile(file: CaptureFile): string;     // JSON, 2-space indent
export function defaultCaptureFileName(at: Date): string;            // debug-capture-YYYYMMDD-HHmmss.json (local time)
```

Export all of the above from `core/index.ts`. Nothing else.

## Behavior

### `RingBuffer`
Fixed-size circular buffer — O(1) push, no `Array.prototype.shift()` on a
growing array (that is O(n) per push at 5000 entries × many frames/s).

### `toJsonSafe(value, maxDepth)`
Turns anything a developer might `console.log` into a `JsonValue`, without
throwing and without holding references.

| Input | Output |
|---|---|
| string, boolean, `null`, finite number | as-is |
| `NaN`, `±Infinity` | `'NaN'`, `'Infinity'`, `'-Infinity'` |
| `undefined` | `'[undefined]'` |
| bigint | `'123n'` |
| symbol | `'Symbol(desc)'` |
| function | `'[Function name]'` / `'[Function anonymous]'` |
| `Error` | `{ name, message, stack }` (stack may be `null`) |
| `Date` | ISO string (`'[Invalid Date]'` if invalid) |
| `RegExp` | `'/x/g'` |
| `Map` | `{ '[Map]': [[k, v], …] }` (entries cloned) |
| `Set` | `{ '[Set]': [v, …] }` |
| ArrayBuffer / typed array / DataView | `'[ArrayBuffer 16 bytes]'` / `'[Uint8Array 16 bytes]'` |
| DOM `Node` (guard `typeof Node !== 'undefined'`) | `'[HTMLDivElement div#id.a.b]'` / `'[Text]'` |
| circular reference | `'[Circular]'` |
| depth beyond `maxDepth` | `'[Object]'` / `'[Array(3)]'` |
| a getter / `toJSON` that throws | `'[Thrown: <message>]'` for that property |
| arrays > 100 items, objects > 100 keys | first 100, plus `'…N more'` marker (array: extra item; object: key `'…'`) |

Own enumerable string keys only. Depth 0 = the top value itself is cloned
shallowly (primitives fine; object/array → placeholder).

### `redact*`
- `redactHeaders` — case-insensitive name match; returns a new map; keys
  normalised to lower-case.
- `redactJsonValue` — recursive; any object key matching (case-insensitive)
  has its value replaced by `replacement`, whatever it was.
- `redactJsonText` — if `text` parses as JSON **and** the result is an
  object or array: redact and `JSON.stringify` (compact). Otherwise return
  `text` unchanged. Never throws.
- `matchesAny` — `lastIndex`-safe (a `/g` pattern must not alternate between
  true and false across calls: reset `lastIndex` or use `String.prototype.search`).

### `truncate(text, max)`
`text.length <= max` → unchanged. Otherwise `text.slice(0, max)` +
`'…[truncated N chars]'` where N = removed count.

### `resolvePolicy(overrides)`
Spread overrides on `DEFAULT_CAPTURE_POLICY`. Validate: `maxEntries` integer
≥ 1, `maxBodyLength` integer ≥ 0, `maxArgDepth` integer ≥ 0 — otherwise throw
`RangeError` naming the field. (This is the one place that may throw: it runs
at install time, before anything is patched.) Return a frozen object.

### `createRecorder(policy)` — the pipeline
`record(draft)` runs, in this order, inside one `try/catch` (any throw →
`failed++`, swallowed):

1. **Ignore** — `http` / `ws` drafts whose `url` `matchesAny(ignoreUrls)` →
   `dropped++`, stop.
2. **Sample** — if `policy.sample` returns `false` → `dropped++`, stop. If
   `sample` throws → keep the draft and `failed++` (fail open: a buggy
   sampler must not silently lose data).
3. **Normalise** — `switch (draft.kind)` with a `never` default:
   - `log`: each arg → `toJsonSafe(arg, maxArgDepth)` →
     `redactJsonValue(…, redactJsonKeys)`.
   - `http`: method upper-cased; both header maps → `redactHeaders`. Each
     non-null body: if `url` matches `redactBodyUrls` → `redactedValue`;
     else `redactJsonText` → `truncate(maxBodyLength)`.
   - `ws`: non-null `data`: `redactBodyUrls` match → `redactedValue`; else if
     `opcode === 'text'` → `redactJsonText` → `truncate`; else (binary /
     close reason) → `truncate`.
   - `error`: `message` and `stack` → `truncate`.
4. **Stamp** — `seq = ++counter` (never reset). Freeze the top-level entry.
5. **Store** — `buffer.push`; an evicted item → `evicted++`. `recorded++`.
6. **Notify** — each listener in a separate `try/catch`. Iterate a copy so a
   listener can unsubscribe itself.

`clear()` empties the buffer and zeroes all four counters; `seq` continues.
`stats()` returns a new object. `snapshot()` returns `buffer.toArray()`.

### Serializer
`buildCaptureFile` sets `schemaVersion: CAPTURE_SCHEMA_VERSION`.
`defaultCaptureFileName(new Date(2026, 9, 12, 8, 5, 3))` →
`'debug-capture-20261012-080503.json'`.

## Required specs (names are the invariants)

`ring-buffer.spec.ts`
- `rejects a capacity below 1 or non-integer`
- `keeps insertion order below capacity`
- `evicts the oldest and returns it once full`
- `toArray returns oldest first after wrapping`
- `clear empties it and keeps the capacity`

`json-safe.spec.ts`
- one spec per table row above, plus `does not throw on a hostile object`
  (a Proxy whose every trap throws) and `returns a value JSON.stringify accepts`

`redact.spec.ts`
- `redacts header values case-insensitively and lower-cases keys`
- `redacts nested JSON keys at any depth, including inside arrays`
- `leaves non-JSON text untouched`
- `leaves JSON primitives untouched` (e.g. `'"password"'`, `'42'`)
- `redacts the login request body's password` —
  `{"username":"op","password":"s3cret","mode":"operation","position":"active"}`
- `matchesAny is stable with global regexes`

`truncate.spec.ts`
- `leaves short text unchanged`
- `truncates and reports the removed count`

`policy.spec.ts`
- `returns the defaults when no overrides are given`
- `applies overrides`
- `throws RangeError naming the field for invalid limits`
- `returns a frozen policy`

`recorder.spec.ts`
- `assigns seq from 1 and never reuses it after clear`
- `drops ignored URLs and counts them`
- `drops drafts the sampler rejects`
- `keeps the draft and counts a failure when the sampler throws`
- `redacts headers before storing`
- `redacts JSON body keys before storing`
- `replaces bodies whole for redactBodyUrls`
- `truncates bodies, frame data, messages and stacks`
- `clones log args so later mutation does not change the entry`
- `evicts beyond maxEntries and counts evictions`
- `clear empties the buffer and zeroes stats`
- `notifies listeners after storing, isolates a throwing listener`
- `unsubscribe stops notifications`
- `never throws, counts failures` (e.g. a draft whose getter throws)

`serializer.spec.ts`
- `builds a file with the current schema version`
- `serializes to JSON that round-trips`
- `formats the default file name from local time`

`clock.spec.ts`
- `systemClock returns epoch milliseconds`

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/core/**/*.spec.ts'
<run-tests.sh>
```

## Out of scope

Probes, sinks, install, Angular. No `console.*` anywhere in this PR.
