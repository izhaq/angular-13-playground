# PR 6 — Sinks: download file, copy to clipboard

**Branch:** `claude/dc-06-sinks` → base `claude/air-gapped-debug-logging-zkn1nr`
**Wave:** 2 (parallel with PRs 2–5, 7) · **Depends on:** PR 1
**Read first:** `specs/4-debug-capture/plan.md`.

## Goal

The two ways data leaves the browser on a machine without DevTools: save a
file, or put text on the clipboard. Sinks take a **plain string** — they know
nothing about entries or the serializer (PR 8 composes
`serializeCaptureFile(...)` → sink). That is what lets this PR run in
parallel with core.

## Owned paths

```
src/debug-capture/adapters/sinks/download.sink.ts
src/debug-capture/adapters/sinks/download.sink.spec.ts
src/debug-capture/adapters/sinks/clipboard.sink.ts
src/debug-capture/adapters/sinks/clipboard.sink.spec.ts
src/debug-capture/adapters/sinks/index.ts
```

Imports: same-directory files only (you need nothing from the core barrel;
importing it for a type is allowed). No packages.

## Public API — exact names (PR 8 imports these)

```ts
// download.sink.ts
export interface DownloadHost {
  document: Pick<Document, 'createElement' | 'body'>;
  URL: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  /** Defers the object-URL revoke until after the click is processed. */
  defer(fn: () => void): void;
}
export function downloadText(text: string, filename: string, mimeType?: string, host?: DownloadHost): void;
//   mimeType defaults to 'application/json'. host defaults to the real document / URL / setTimeout(fn, 0).

// clipboard.sink.ts
export interface ClipboardHost {
  navigator: { clipboard?: Pick<Clipboard, 'writeText'> };
  document: Pick<Document, 'createElement' | 'body' | 'execCommand'>;
  isSecureContext: boolean;
}
export function copyText(text: string, host?: ClipboardHost): Promise<boolean>;
//   host defaults to the real navigator / document / isSecureContext.
```

`index.ts` exports exactly these four names.

## Behavior

### `downloadText`
- `new Blob([text], { type: mimeType })` → `URL.createObjectURL` → an
  `<a>` with `href`, `download = filename`, `rel = 'noopener'`, hidden;
  append to `document.body`, `click()`, remove it; `defer` the
  `revokeObjectURL` (revoking synchronously can cancel the download in some
  browsers).
- Always removes the anchor and revokes the URL, even if `click()` throws
  (`try/finally`); the error then propagates — the caller (PR 8) decides.

### `copyText` — must work on plain-HTTP intranet hosts
`navigator.clipboard` exists only in **secure contexts** (HTTPS or
localhost). An air-gapped intranet app served over plain HTTP has none, so
the fallback is the normal path there, not an edge case.

1. If `isSecureContext` and `navigator.clipboard?.writeText` exist → await it
   → resolve `true`. If it rejects (permission denied, document not focused)
   → fall through to 2.
2. Fallback: a `<textarea>` with the text, `readonly`, positioned off-screen
   (`position: fixed; top: -9999px; opacity: 0`), appended to `body`,
   `select()`, `document.execCommand('copy')`, removed in `finally`. Resolve
   with `execCommand`'s boolean.
3. **Never rejects** — any throw resolves `false`.
- Restore the user's previous selection / focus if there was one (save
  `document.activeElement`, re-focus it after) — copying must not steal focus
  from an input the user was typing in.

## Specs

Fake hosts throughout; do not trigger a real download or touch the real
clipboard.

`download.sink.spec.ts`
- `creates a blob with the given text and MIME type`
- `clicks a hidden anchor with the filename, then removes it`
- `revokes the object URL only after deferral`
- `cleans up even if click throws, and rethrows`
- `defaults the MIME type to application/json`

`clipboard.sink.spec.ts`
- `uses navigator.clipboard in a secure context`
- `falls back to execCommand when not in a secure context`
- `falls back when navigator.clipboard rejects`
- `resolves false instead of rejecting when everything fails`
- `removes the textarea and restores focus afterwards`

## Verification

```bash
npx tsc -p tsconfig.spec.json --noEmit
npx tsc -p tsconfig.app.json --noEmit
npm run lint:layers
<run-tests.sh> --include 'src/debug-capture/adapters/sinks/**/*.spec.ts'
<run-tests.sh>
```

## Out of scope

Serialization, keyboard shortcuts, file naming — PR 2 and PR 8.
