# Debug capture

A small recorder for machines with no browser DevTools. When it is on, it
keeps a record of:

- console output (`log`, `info`, `warn`, `error`, `debug`),
- uncaught errors and unhandled promise rejections,
- REST calls (XHR and `fetch`),
- WebSocket traffic.

You press a shortcut, and it saves everything as one JSON file. You hand that
file to a developer.

It is off by default. When it is off, nothing is changed on the page.

Why we built it, and what we rejected: `docs/intent/debug-capture.md`.

## Turn it on

Pick one, then load the page:

- Add `?debug=1` to the URL (works for this page load only).
- Or run this once in the browser, to keep it on in that browser:

  ```js
  localStorage.setItem('debug-capture', '1');
  ```

  To turn it off again: `localStorage.removeItem('debug-capture')`.

The flag is read once, at page load. Set it, then reload.

## Shortcuts

| Keys | What it does |
|---|---|
| `Ctrl+Alt+Shift+D` | Download the capture as a `.json` file |
| `Ctrl+Alt+Shift+C` | Copy the capture to the clipboard |
| `Ctrl+Alt+Shift+X` | Clear the capture |

The keys are matched by their place on the keyboard, so they work with any
keyboard language. Three modifiers keep them away from browser shortcuts.

## What the file looks like

```json
{
  "schemaVersion": 1,
  "capturedAt": "2026-10-12T08:30:00.000Z",
  "page": "http://station-7/experiments?debug=1",
  "userAgent": "Mozilla/5.0 ...",
  "stats": { "recorded": 4, "dropped": 0, "evicted": 0, "failed": 0 },
  "entries": [
    { "kind": "log", "seq": 1, "t": 1791794000000, "level": "warn", "args": ["grid is slow", { "rows": 900 }] },
    {
      "kind": "error", "seq": 2, "t": 1791794000100, "source": "window",
      "message": "Cannot read properties of undefined (main.js:1:2345)", "stack": "TypeError: ..."
    },
    {
      "kind": "http", "seq": 3, "t": 1791794000200, "transport": "xhr",
      "method": "POST", "url": "http://station-7/api/auth/login", "status": 200, "durationMs": 84,
      "reqHeaders": { "content-type": "application/json" }, "resHeaders": { "content-type": "application/json" },
      "reqBody": "{\"username\":\"op\",\"password\":\"[redacted]\"}", "resBody": "{\"ok\":true}",
      "bytes": 11, "error": null
    },
    {
      "kind": "ws", "seq": 4, "t": 1791794000300, "socketId": 1, "url": "ws://station-7/live",
      "event": "receive", "opcode": "text", "bytes": 14, "data": "{\"value\":42.5}", "code": null
    }
  ]
}
```

- `seq` — order number. It keeps counting, even after a clear.
- `t` — time in epoch milliseconds.
- `stats` — `dropped` means skipped by the rules below; `evicted` means pushed
  out because the buffer was full.
- An error with `source: "capture"` is the recorder telling you about itself,
  for example "probe websocket failed to install".

## Change the rules (policy)

`installDebugCapture()` takes options. Everything has a safe default.

```ts
installDebugCapture({
  policy: {
    maxEntries: 5000,          // keep the newest 5000 entries
    maxBodyLength: 32768,      // cut longer bodies / frames / URLs / stacks
    maxArgDepth: 6,            // how deep logged objects are copied
    redactHeaders: ['authorization', 'cookie' /* ... */],
    redactJsonKeys: ['password', 'token' /* ... */],
    redactBodyUrls: [/\/api\/secret\//],   // hide whole bodies for these URLs
    ignoreUrls: [/\/health$/],             // do not record these at all
    sample: (draft) => true,               // return false to skip an entry
  },
  shortcuts: { download: 'ctrl+alt+shift+s' },   // or `false` for none
});
```

- Redaction happens **before** anything is stored. A redacted value can never
  end up in a file.
- `redactJsonKeys` names are compared ignoring case, `_` and `-`. So
  `accesstoken` also hides `access_token`, `Access-Token` and `accessToken`.
- A key is secret when it **ends with** one of those names: `password` also
  hides `newPassword` and `confirm_password`, but not `passwordPolicy`. So
  paging keys like `nextToken` are hidden too. Header names must match
  exactly.
- The values of secret names are hidden in:
  - JSON request / response bodies and JSON WebSocket text frames,
  - logged objects, logged `Map`s (Angular's `HttpHeaders` keeps its values in
    one) and `{ name, value }` pairs (how `HttpHeaders` keeps pending changes),
  - logged strings and error messages that hold JSON or a URL,
  - URL query parameters of requests and sockets
    (`wss://h/ws?access_token=[redacted]&x=1`),
  - form bodies (`application/x-www-form-urlencoded`, or no content type).
- `ignoreUrls` and `redactBodyUrls` match the **original** URL. Query
  redaction only changes what is stored.
- One `console.log` call is bounded: at most 1000 values, and at most
  `maxBodyLength` characters of text for all its arguments together. Past
  that, values become `"[…]"`. Long URLs and header values are cut to
  `maxBodyLength` too.
- Stored entries are frozen all the way down, so a listener on `onEntry()`
  cannot change what gets exported.
- A bad limit (like `maxEntries: 0`) throws right away, before anything is
  changed on the page.
- The full list of default redactions is `DEFAULT_CAPTURE_POLICY` in
  `contract/capture-contract.ts`.

## How it is built

Six layers. Each layer imports only the `index.ts` of the layer right above
it.

```
L1 contract   src/debug-capture/contract/        types and constants
L2 core       src/debug-capture/core/            pure logic (recorder, rules, file format)
L3 adapters   src/debug-capture/adapters/        probes (patch console, XHR, fetch, WebSocket, errors) + sinks (file, clipboard)
L4 install    src/debug-capture/install/         wires it all together; the only place real globals are picked
L5 public     src/debug-capture/index.ts         the public API
L6 angular    src/app/features/debug-capture/    Angular ErrorHandler + DI token (optional)
```

The rest of the app imports only `src/app/features/debug-capture` (or
`src/debug-capture` if it does not need Angular). Nothing under
`src/debug-capture/` imports a package — no Angular, no rxjs.

`npm run lint:layers` checks these rules. Run it before you push.

## Use it in another project

1. Copy `src/debug-capture/` as it is. It has no dependencies.
2. Call `installDebugCapture()` as the **first thing** your app does — before
   it makes any request or opens any socket:

   ```ts
   import { installDebugCapture, isDebugRequested } from './debug-capture';

   if (isDebugRequested()) {
     installDebugCapture();
   }
   ```

3. Angular only, optional: also copy `src/app/features/debug-capture/`. Pass
   the session to `provideDebugCaptureSession(session)` in the platform
   providers, and add `provideDebugCapture()` to the root providers. Then
   errors Angular catches itself are recorded too (see `src/main.ts` and
   `src/app/app.module.ts`).

## Known limitations

- A request is recorded when it **finishes** (load, error, abort or timeout).
  A request that never finishes does not appear.
- Sockets opened **before** capture starts are not recorded.
- Streaming bodies (`text/event-stream`) and binary `fetch` bodies are not
  read.
- A page that loaded **before** the flag was set records nothing. Set the
  flag, then reload.
- Some secrets are **not** redacted, because there are no keys to match:
  - text frames that are not plain JSON, such as socket.io `42["login",{…}]`
    or STOMP frames,
  - NDJSON (one JSON object per line) bodies,
  - free-text error messages and stacks (only JSON and URL parameters in them
    are redacted),
  - secrets under a name that does not end with one in `redactJsonKeys`
    (for example `pin` — add it if your app uses it).
  Use `redactBodyUrls` to hide whole bodies and frames for such endpoints.
- Logging an object runs its getters, at log time, to copy it.

## Be careful with the files

Passwords, tokens and auth headers are redacted. But a file can still hold
business data: experiment values, user names, URLs. Treat it as sensitive, and
hand it over the same way as any other internal data.
