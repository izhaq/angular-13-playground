# PR 4 — Probes: XHR and fetch

**Branch:** `claude/dc-04-probes-http` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 2 (parallel with PRs 2, 3, 5–7) · **Depends on:** PR 1
**Read first:** `specs/4-debug-capture/plan.md` (*Design rules*), the contract
(`HttpEntry` especially).

## Goal

One `HttpEntry` per completed request, for both transports. Angular's
`HttpClient` goes through XHR (`HttpXhrBackend` builds `new XMLHttpRequest()`
at request time), so the XHR probe is what sees this app's REST traffic;
fetch covers everything else.

## Owned paths

```
src/debug-capture/adapters/probes/http/http-helpers.ts        (module-internal, NOT exported from index)
src/debug-capture/adapters/probes/http/http-helpers.spec.ts
src/debug-capture/adapters/probes/http/xhr.probe.ts
src/debug-capture/adapters/probes/http/xhr.probe.spec.ts
src/debug-capture/adapters/probes/http/fetch.probe.ts
src/debug-capture/adapters/probes/http/fetch.probe.spec.ts
src/debug-capture/adapters/probes/http/index.ts
```

Imports: same-directory files and the core barrel (`'../../../core'`) for
contract types only (`Recorder`, `Clock`, `Probe`, `HeaderMap`,
`EntryDraft`). PR 2 is built in parallel — use no core function. Specs use an
inline fake `Recorder` and fake `Clock`.

## Public API — exact names (PR 8 imports these)

```ts
// xhr.probe.ts
export interface XhrHost {
  XMLHttpRequest: { prototype: XMLHttpRequest };
  location: { href: string };
}
export function installXhrProbe(recorder: Recorder, clock: Clock, host?: XhrHost): Probe;
//   host defaults to globalThis. Probe.name === 'xhr'.

// fetch.probe.ts
export interface FetchHost {
  fetch: typeof fetch;
  location: { href: string };
}
export function installFetchProbe(recorder: Recorder, clock: Clock, host?: FetchHost): Probe;
//   host defaults to globalThis. Probe.name === 'fetch'.
```

`index.ts` exports `installXhrProbe`, `installFetchProbe`, `XhrHost`,
`FetchHost` — nothing from `http-helpers.ts`.

## Shared helpers (`http-helpers.ts`)

- `toAbsoluteUrl(url: string | URL, base: string): string` — `new URL(…).href`,
  falls back to `String(url)` if that throws.
- `parseRawHeaders(raw: string): HeaderMap` — the
  `getAllResponseHeaders()` format (CRLF lines, `name: value`), lower-case keys.
- `headersToMap(init: HeadersInit | undefined): HeaderMap` — `Headers`,
  `[k, v][]` or record; lower-case keys; duplicates joined with `', '`.
- `describeBody(body: unknown): string | null` — string as-is;
  `URLSearchParams` → `toString()`; `FormData` → `'[FormData: a, b]'` (keys);
  `Blob` → `'[Blob 12 bytes]'`; `ArrayBuffer` / `ArrayBufferView` →
  `'[Binary 12 bytes]'`; `ReadableStream` → `'[ReadableStream]'`; `Document`
  → `'[Document]'`; `null` / `undefined` → `null`; else `String(body)`.
- `isTextual(contentType: string | null): boolean` — true for `text/*`
  (except `text/event-stream`), `*json*`, `*xml*`, `*javascript*`,
  `application/x-www-form-urlencoded`, `*graphql*`. A missing content type
  counts as textual.
- `utf8Length(text: string): number` — byte length without allocating a
  `TextEncoder` per call.

## Behavior — XHR probe

Patch **the prototype** (`host.XMLHttpRequest.prototype`) methods `open`,
`setRequestHeader`, `send` — not the constructor — so `instanceof` and
`new XMLHttpRequest()` stay untouched.

- Per-instance state in a `WeakMap<XMLHttpRequest, State>` (no expando
  properties on the app's objects).
- `open(method, url, …rest)`: reset state for this instance; store
  upper-cased method and absolute URL (`host.location.href` as base).
- `setRequestHeader(name, value)`: store lower-case; repeated names join with
  `', '` (what XHR itself sends).
- `send(body)`: stamp start time, `reqBody = describeBody(body)`. The first
  time an instance is sent, attach `abort` / `timeout` / `error` listeners
  (set the error flag) and a `loadend` listener (records). Listeners read the
  current state, so a reused instance (`open` again) works.
- On `loadend`: `status` = `xhr.status` or `null` when 0 or an error flag is
  set; `resHeaders` = `parseRawHeaders(getAllResponseHeaders())`; `resBody` by
  `responseType`: `''`/`'text'` → `responseText`; `'json'` →
  `JSON.stringify(response)`; `'arraybuffer'` / `'blob'` →
  `'[arraybuffer 12 bytes]'` / `'[blob 12 bytes]'`; `'document'` →
  `'[document]'`. Never read `responseText` for other response types (it
  throws `InvalidStateError`). `bytes` = `content-length` header if numeric,
  else `utf8Length(resBody)` for text, else `null`. `durationMs` from the
  clock. `transport: 'xhr'`.
- Every original is called exactly once with the same `this` / arguments and
  its result returned, even when bookkeeping throws.
- `dispose()`: restore each method. Track whether it was an **own** property
  of the prototype before patching — if it was inherited (e.g. a subclass
  host in specs), `delete` our own property instead of assigning. If someone
  re-patched on top of us, leave theirs and become a pass-through.
  Idempotent. In-flight requests do not record after dispose.

## Behavior — fetch probe

Replace `host.fetch` with a wrapper.

- Read method / URL / headers from a `Request` input or a string/`URL`, with
  `init` taking precedence (what `fetch` does). URL made absolute.
  `reqBody`: `describeBody(init.body)`; a `Request` input with a body and no
  `init.body` → `'[Request body]'` (don't read the stream).
- Call the original as `original.call(host, input, init)` — exactly once.
  Return **the original promise's outcome unchanged**: resolve with the very
  same `Response` object, reject with the very same error.
- On resolve: if `isTextual(content-type)`, read `response.clone().text()`
  **without awaiting it in the chain the caller sees**, then record. Otherwise
  record with `resBody: null`. A failed body read records with
  `resBody: null`. `bytes` as for XHR.
- On reject: `error: 'abort'` when the error's `name` is `'AbortError'`,
  else `'network'`; `status: null`; record; the caller still gets the
  original rejection.
- `dispose()`: restore `host.fetch` if it is still our wrapper, else become a
  pass-through. Idempotent. Pending fetches do not record after dispose.

## Specs — use fake hosts, plus real-browser checks without a server

Never patch the real `window.fetch` / `XMLHttpRequest.prototype`. Real
network behaviour can still be exercised:
- **XHR:** host `{ XMLHttpRequest: class extends XMLHttpRequest {}, location }`
  — patching the subclass prototype leaves the global alone. Request a
  `blob:` URL (`URL.createObjectURL(new Blob(['{"a":1}'], { type: 'application/json' }))`).
- **fetch:** host `{ fetch: window.fetch.bind(window), location }`, same
  `blob:` URL. A connection-refused URL such as `http://127.0.0.1:9/` gives a
  real network error; `AbortController` gives a real abort.
- Edge cases (timeout, odd response types) via a small fake XHR class.

`http-helpers.spec.ts` — one or more specs per helper, including
`isTextual rejects text/event-stream` and `utf8Length counts multi-byte characters`.

`xhr.probe.spec.ts`
- `records method, absolute URL, status, headers, bodies and duration`
- `records the response of a real XHR to a blob URL`
- `joins repeated request headers like XHR does`
- `records abort, timeout and network errors with status null`
- `describes non-text response types without reading responseText`
- `handles a reused instance`
- `calls each original exactly once with the same this and args`
- `still sends when bookkeeping throws`
- `restores the prototype on dispose (own and inherited methods)`
- `records nothing for requests completing after dispose`
- `dispose is idempotent`

`fetch.probe.spec.ts`
- `records a real fetch of a blob URL with its body`
- `resolves with the same Response object and leaves its body readable`
- `takes method, headers and body from init over a Request`
- `marks a Request body without reading it`
- `does not read non-textual or event-stream bodies`
- `records a network error and rethrows the same error`
- `records an abort as error abort`
- `restores fetch on dispose; pass-through if re-patched`
- `records nothing for fetches settling after dispose`

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/adapters/probes/http/**/*.spec.ts'
<run-tests.sh>
```

## Out of scope

WebSocket, console. Redaction/truncation — the recorder does that.
