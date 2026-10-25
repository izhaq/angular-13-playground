# Debug panel — how it is added to this app

This app has an **on-screen debug panel**. It shows the app's HTTP requests,
WebSocket messages, console output and errors — live, inside the page. It is
for stations that have no browser DevTools (air-gapped networks).

This page explains, step by step:

1. [How to use it](#1-how-to-use-it)
2. [What was added to this app](#2-what-was-added-to-this-app)
3. [How to add it to another Angular app](#3-how-to-add-it-to-another-angular-app)
4. [How to update it to a new version](#4-how-to-update-it-to-a-new-version)
5. [How to remove it](#5-how-to-remove-it)
6. [Questions and problems](#6-questions-and-problems)

---

## 1. How to use it

The panel is **off by default**. With it off, nothing is recorded and nothing
is shown.

**Turn it on** — pick one:

| Way | How | Lasts |
| --- | --- | --- |
| URL | Add `?debug=1` to the address, then press Enter | This page load only |
| Browser | Open the console once and run `localStorage.setItem('debug-capture', '1')`, then reload | Every load in this browser, until you remove it |

**Open the panel** — pick one:

- Press **`Ctrl+Alt+Shift+P`**, or
- click the small **DBG** button in the corner of the screen.

Press the same keys again, or `Escape`, to close it.

**Inside the panel:**

- **Network › HTTP** — every request. Click one to see headers, body and timing,
  or to copy it as a cURL command.
- **Network › WebSocket** — every connection and its messages.
- **Console** — logs, warnings, errors, and errors Angular caught.
- **Export** (toolbar) — **Download all (JSON)** saves everything to one file.
  Send that file to a developer. It can be read without the panel.
- **Note** (toolbar) — write a short note (a title and some text), for example
  "clicked Save now". It shows in **Console** and in the exported file, at that
  moment, so a developer can see what you did when.
- **Settings** (gear) — besides theme, dock, text size and time:
  - **Buffer** — how many entries are kept: 1,000 · 5,000 (default) · 10,000 ·
    50,000 · **No limit**. When it is full, the oldest entries are dropped.
    No limit keeps everything, but the page may get slow and use a lot of memory.
  - **DBG button** — show or hide the corner button. The shortcut always works.
  - Both are remembered in this browser.
- **Warnings** — a banner when the buffer is almost full (with **Download all**
  and **Raise the limit**), and one each time the recorded data passes another
  25 MB. Click **Dismiss** to hide it; it comes back at the next step.

Passwords, tokens and auth headers are hidden before anything is stored. Still,
treat an exported file as sensitive.

**Turn it off:** remove `?debug=1` from the URL, or run
`localStorage.removeItem('debug-capture')`, then reload.

---

## 2. What was added to this app

Only **five things**. Nothing else in the app knows the panel exists.

| # | File | What it is |
| --- | --- | --- |
| 1 | `vendor/debug-capture-2.1.0-alpha.0.tgz` | The package itself, as one file. This is the file you carry into the air-gapped network. |
| 2 | `package.json` | One line in `dependencies`: `"debug-capture": "file:vendor/debug-capture-2.1.0-alpha.0.tgz"`. `npm install` reads the package from that file — no internet needed. (`package-lock.json` changes with it.) |
| 3 | `src/app/features/debug-panel/` | The only code that imports the package: `startDebugPanel()` and `provideDebugPanel()`, plus a small spec. |
| 4 | `src/main.ts` | Calls `startDebugPanel()` **before** Angular starts, and passes its result to `platformBrowserDynamic(…)`. |
| 5 | `src/app/app.module.ts` | Adds `provideDebugPanel()` to `providers`. |

Why each piece:

- **`startDebugPanel()` runs before Angular starts.** So the very first requests
  the app makes are recorded too. It also means the panel still works if Angular
  fails to start — which is exactly when you need it most.
- **`provideDebugPanel()`** replaces Angular's error handler with one that also
  records the error. It still prints the error to the console, like before.
- **The panel's UI is loaded only on first open.** At start-up the app loads only
  a small part (about 5 kB, gzipped). The rest (about 40 kB) loads when someone
  opens the panel.

> The old recorder (v1) is still in the repo, in `src/debug-capture/` and
> `src/app/features/debug-capture/`, but the app no longer uses it. It can be
> deleted later in its own change. Do not wire both: the new one refuses to
> start while another capture is running.

---

## 3. How to add it to another Angular app

Works with Angular 16 to 20. You need Node 20.19+, 22.13+ or 24+.

### Step 1 — Put the package file in the app

Copy `debug-capture-2.1.0-alpha.0.tgz` into a `vendor/` folder at the root of
the app (next to `package.json`).

```
my-app/
  package.json
  vendor/
    debug-capture-2.1.0-alpha.0.tgz
  src/
```

### Step 2 — Install it

From the app's root folder:

```bash
npm install ./vendor/debug-capture-2.1.0-alpha.0.tgz
```

Check `package.json`. You should now see this line in `dependencies`:

```json
"debug-capture": "file:vendor/debug-capture-2.1.0-alpha.0.tgz"
```

Commit the `.tgz` file, `package.json` and `package-lock.json` together. From
now on a plain `npm install` (or `npm ci`) installs the panel from the file.

### Step 3 — Copy the wiring folder

Copy the folder `src/app/features/debug-panel/` from this repo into the same
place in your app. It has three files:

- `debug-panel.ts` — the code (about 20 lines),
- `index.ts` — exports the two functions,
- `debug-panel.spec.ts` — a small test (optional).

This is what `debug-panel.ts` does:

```ts
export function startDebugPanel(): StaticProvider[] {
  const controller = isDebugRequested() ? createCaptureController() : null; // on only with the flag
  installDebugPanel(controller); // the DBG button and the shortcut
  return [provideDebugCaptureSession(controller?.session ?? null)];
}

export function provideDebugPanel(): Provider[] {
  return provideDebugCapture(); // records errors Angular catches
}
```

### Step 4 — Call it in `main.ts`

Add the import, call `startDebugPanel()` **before** bootstrap, and pass the
result to `platformBrowserDynamic`:

```ts
import { startDebugPanel } from './app/features/debug-panel';

const debugPanelProviders = startDebugPanel();

platformBrowserDynamic(debugPanelProviders)
  .bootstrapModule(AppModule)
  .catch(err => console.error(err));
```

If your `platformBrowserDynamic([...])` already has providers, add them
together: `platformBrowserDynamic([...yourProviders, ...debugPanelProviders])`.

**Standalone app** (`bootstrapApplication` instead of an `AppModule`)? Then put
both in the app's providers:

```ts
bootstrapApplication(AppComponent, {
  providers: [...startDebugPanel(), provideDebugPanel() /* , your providers */],
});
```

### Step 5 — Add the error handler in `app.module.ts`

```ts
import { provideDebugPanel } from './features/debug-panel';

@NgModule({
  // ...
  providers: [
    // ...your providers
    provideDebugPanel(),
  ],
})
export class AppModule {}
```

If your app already has its own `ErrorHandler`, keep only one of them: two
`ErrorHandler` providers mean the last one wins.

### Step 6 — Check it

```bash
npm run build
npm start
```

1. Open the app **without** `?debug=1`. There must be no DBG button.
2. Open it **with** `?debug=1`. The DBG button shows in a corner.
3. Press `Ctrl+Alt+Shift+P`. The panel opens and shows the app's requests.

Done.

---

## 4. How to update it to a new version

1. Delete the old `.tgz` from `vendor/`, and put the new one there.
2. Install it (use the new file name):

   ```bash
   npm install ./vendor/debug-capture-<new-version>.tgz
   ```

3. Run the app's checks and do Step 6 above.
4. Commit the new `.tgz`, `package.json` and `package-lock.json` together.

**Where does a new `.tgz` come from?** From the package source in
`packages/debug-capture/` (in this repo for now):

```bash
cd packages/debug-capture
npm ci
npm run check      # every test must pass
npm pack           # writes debug-capture-<version>.tgz here
```

---

## 5. How to remove it

The panel touches the app in only a few places, so removing it is quick:

1. In `src/main.ts`, delete the `startDebugPanel` import and the
   `const debugPanelProviders = startDebugPanel();` line, and change
   `platformBrowserDynamic(debugPanelProviders)` back to
   `platformBrowserDynamic()`.
2. In `src/app/app.module.ts`, delete the `provideDebugPanel` import and the
   `provideDebugPanel(),` line in `providers`.
3. Delete the folder `src/app/features/debug-panel/`.
4. Uninstall the package and delete its file:

   ```bash
   npm uninstall debug-capture
   rm vendor/debug-capture-2.1.0-alpha.0.tgz
   ```

5. Build to check nothing else used it: `npm run build`.

---

## 6. Questions and problems

**I added `?debug=1` but there is no DBG button.**
Reload the page after changing the URL. The flag is read once, when the app
starts. Also check the address really has `?debug=1` (or `&debug=1` if there
are other parameters already).

**The shortcut does nothing.**
Click inside the page first, so it has keyboard focus. The keys are matched by
position on the keyboard, so they also work with a Hebrew keyboard layout.

**The panel is on screen but I cannot click it.**
The app is in fullscreen, or it shows a modal dialog. The browser blocks clicks
outside that dialog. Leave fullscreen or close the dialog; the panel says so in a
banner.

**Does it slow the app down when it is off?**
No. With the flag off, nothing is patched or recorded. The app downloads about
4–5 kB (gzipped) more at start-up; that is all.

**Does it send data anywhere?**
No. The panel never makes network requests. Copy and export happen only when
someone clicks.

**Which browsers?**
Chrome 146 or newer.

**More detail** (all options, the keyboard map, the file format): see
[`packages/debug-capture/README.md`](../packages/debug-capture/README.md).
