# PR 5 — Probe: WebSocket

**Branch:** `claude/dc-05-probe-websocket` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 2 (parallel with PRs 2–4, 6, 7) · **Depends on:** PR 1
**Read first:** `specs/4-debug-capture/plan.md` (*Design rules*), the contract
(`WebSocketEntry` especially).

## Goal

Record every WebSocket connection's lifecycle and every frame in both
directions. This is the capture no off-the-shelf tool gave us. The app's
socket is opened by rxjs `webSocket()` (see
`src/app/features/system-experiments/system-experiments.module.ts`), which
reads the global `WebSocket` constructor when the subject is created — so a
probe installed in `main.ts` before bootstrap sees it.

## Owned paths

```
src/debug-capture/adapters/probes/websocket/websocket.probe.ts
src/debug-capture/adapters/probes/websocket/websocket.probe.spec.ts
src/debug-capture/adapters/probes/websocket/frame-data.ts          (module-internal)
src/debug-capture/adapters/probes/websocket/frame-data.spec.ts
src/debug-capture/adapters/probes/websocket/index.ts
```

Imports: same-directory files and the core barrel (`'../../../core'`) for
contract types only. PR 2 is built in parallel — use no core function.

## Public API — exact names (PR 8 imports these)

```ts
export interface WebSocketHost {
  WebSocket: typeof WebSocket;
}
export function installWebSocketProbe(recorder: Recorder, clock: Clock, host?: WebSocketHost): Probe;
//   host defaults to globalThis. Probe.name === 'websocket'.
```

`index.ts` exports `installWebSocketProbe` and `WebSocketHost` only.

## Behavior

Replace `host.WebSocket` with a **subclass** of the original:

```ts
class CapturingWebSocket extends Original { … }
```

- Subclassing keeps `instanceof Original` true for new sockets and inherits
  the static `CONNECTING / OPEN / CLOSING / CLOSED` constants. Set the
  subclass's `name` to `'WebSocket'` (`Object.defineProperty`) for code that
  inspects it.
- **Constructor** (`url`, `protocols`): call `super` first; then, guarded,
  assign `socketId` (1-based counter per install) and attach listeners with
  `addEventListener` — never touch `onopen` / `onmessage` etc., the app owns
  those.
  - `open` → `event: 'open'`, `opcode/bytes/data/code: null`.
  - `message` → `event: 'receive'`. `string` data → `opcode: 'text'`,
    `data` as-is, `bytes = utf8Length`. `ArrayBuffer` → `opcode: 'binary'`,
    base64, `bytes = byteLength`. `Blob` → read asynchronously
    (`blob.arrayBuffer()`), then record with base64 — the `t` stamped at
    event time, not after the read.
  - `close` → `event: 'close'`, `code: event.code`, `data: event.reason || null`.
  - `error` → `event: 'error'`, all payload fields `null`.
  - `url` on every entry = `this.url` (the browser's resolved absolute URL).
- **`send(data)`** — `override` it: call `super.send(data)` **first**; only
  if that did not throw, record (guarded) `event: 'send'`. (A send that throws
  `InvalidStateError` while `CONNECTING` was never sent, so it must not be
  recorded.) Data kinds: string → text; `ArrayBuffer` / `ArrayBufferView` →
  binary base64 of exactly the view's bytes; `Blob` → async read as above.
- `t` from `clock.now()`. `kind: 'ws'`.
- **Never break the socket**: listener bodies are guarded; super calls happen
  regardless of bookkeeping failures.
- `dispose()`: if `host.WebSocket` is still our subclass, restore the
  original; set a disposed flag so sockets created during the session stop
  recording (their listeners check it). Idempotent. Sockets created before
  install are not captured — documented limitation.

### `frame-data.ts` helpers
- `utf8Length(text: string): number` — no per-call `TextEncoder`.
- `toBase64(bytes: Uint8Array): string` — chunked `String.fromCharCode` +
  `btoa`, safe for large frames (no spread of a 1 MB array into one call).
- `bytesOf(data: ArrayBuffer | ArrayBufferView): Uint8Array` — respects
  `byteOffset` / `byteLength` of views.

(`utf8Length` intentionally duplicates the one in the http module: siblings
may not import each other, and core is built in parallel. Two tiny copies is
the price of the layer rule; note it in a comment.)

## Specs

Never replace the real `window.WebSocket`.

- **Fake host** for deterministic event specs: a small `FakeWebSocket` class
  extending `EventTarget` with `url`, `readyState`, `send` (spy), `close`, the
  four static constants, and helpers to dispatch `open` / `message`
  (`new MessageEvent('message', { data })`) / `close`
  (`new CloseEvent('close', { code, reason })`) / `error`.
- **Real constructor, real failure, no server:** host
  `{ WebSocket: window.WebSocket }` (a plain object holding the real
  constructor — the global is untouched) and
  `new host.WebSocket('ws://127.0.0.1:9')` → Chrome fires `error` then
  `close` (code 1006). Assert both entries; use Jasmine `done` / async.

`frame-data.spec.ts`
- `utf8Length counts multi-byte characters`
- `toBase64 round-trips large buffers` (≥ 200 kB)
- `bytesOf respects typed-array views`

`websocket.probe.spec.ts`
- `keeps instanceof and the static readyState constants`
- `records open, receive, close and error with the socket's url`
- `records text and binary sends after they succeed`
- `does not record a send that throws`
- `records ArrayBuffer and Blob frames as base64 with byte counts`
- `stamps Blob frames with the event time, not the read time`
- `groups frames by socketId across two sockets`
- `does not touch onmessage/onopen handlers set by the app`
- `records error and close from a real refused connection`
- `still delivers events to the app when recording throws`
- `restores the original constructor on dispose`
- `stops recording on live sockets after dispose`
- `dispose is idempotent`

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/adapters/probes/websocket/**/*.spec.ts'
<run-tests.sh>
```

## Out of scope

Redaction / truncation of frame data — the recorder does that. Throttling —
`CapturePolicy.sample` does that.
