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
| Shortcut | Press **`Ctrl+Alt+Shift+A`** anywhere in the app | This browser, from now on — every later load starts recording with the page, until you press it again |
| URL | Add `?debug=1` to the address, then press Enter | This page load only, recorded from its very start |

The shortcut gives **no visible sign**: recording starts, the panel stays closed
and the DBG button stays hidden. Use `?debug=1` when you need the very first
requests of a fresh browser; after the shortcut, every reload records from the
start too. With `?debug=1` the **DBG** button shows in a corner.

**Open the panel:** press **`Ctrl+Alt+Shift+P`**. Press it again, or `Escape`,
to close it. (To get a **DBG** button in the corner too: Settings › DBG button ›
Show.)

**All shortcuts** — they work with the panel **closed**:

| Keys | What it does |
| --- | --- |
| `Ctrl+Alt+Shift+A` | Turn the tool on (remembered). Press again: off for good |
| `Ctrl+Alt+Shift+P` | Open / close the panel |
| `Ctrl+Alt+Shift+S` | Recording on / off (works while it is off) |
| `Ctrl+Alt+Shift+M` | Add a note "Mark" at this moment (also while recording is off) |
| `Ctrl+Alt+Shift+D` | Save everything as a JSON file (see [Save to a fixed folder](#save-to-a-fixed-folder)) |
| `Ctrl+Alt+Shift+C` | Copy everything (JSON) to the clipboard |
| `Ctrl+Alt+Shift+X` | Clear what was recorded |

The panel lists them too: **Settings › About**, with the package version.

**Inside the panel:**

- **Network › HTTP** — every request. Click one to see headers, body and timing,
  or to copy it as a cURL command.
- **Network › WebSocket** — every connection and its messages.
- **Console** — logs, warnings, errors, and errors Angular caught.
- **Export** (toolbar) — **Download all (JSON)** saves everything to one file.
  Send that file to a developer. It can be read without the panel. Each entry
  starts with `sequence` (its order) and `time` (the station's local time,
  e.g. `2026-10-25T15:08:56.618+03:00`).
- **Note** (toolbar) — write a short note (a title and some text), for example
  "clicked Save now". It shows in **Console** and in the exported file, at that
  moment, so a developer can see what you did when.
- **Settings** (gear) — besides theme, dock, text size and time:
  - **Buffer** — how many entries are kept: 1,000 · 5,000 (default) · 10,000 ·
    50,000 · **No limit**. When it is full, the oldest entries are dropped.
    No limit keeps everything, but the page may get slow and use a lot of memory.
  - **DBG button** — show or hide the corner button (hidden at first after the
    shortcut, shown with `?debug=1`). The shortcut always works.
  - Both are remembered in this browser.
  - **About** — the package version and every shortcut.
- **Warnings** — a banner when the buffer is almost full (with **Download all**
  and **Raise the limit**), and one each time the recorded data passes another
  25 MB. Click **Dismiss** to hide it; it comes back at the next step.

Passwords, tokens and auth headers are hidden before anything is stored. Still,
treat an exported file as sensitive.

**Turn it off:** press **`Ctrl+Alt+Shift+A`** again. Recording stops, the panel
goes away, and the browser forgets it (the next load starts off). On a
`?debug=1` page it turns off that page; remove `?debug=1` from the URL so the
next load stays off.

### Save to a fixed folder

`Ctrl+Alt+Shift+D` saves the file through Chrome's normal download. To have it
land in one fixed folder on every station, **with no "Save as" dialog**, IT sets
these Chrome policies once per station. No change to the app is needed.

| Policy | Value | Why |
| --- | --- | --- |
| `DownloadDirectory` | the folder, e.g. `D:\debug-captures` | every download goes there |
| `PromptForDownloadLocation` | `false` (disabled) | no dialog |
| `DownloadRestrictions` | `0`, or not set | downloads are allowed |
| `AutomaticDownloadsAllowedForUrls` | the app's address, e.g. `https://app.local` | no "download multiple files?" question on the second save |

- **Windows:** Group Policy › Administrative Templates › Google Chrome (the
  Chrome ADMX templates), or the registry under
  `HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome`.
- **Linux:** a JSON file in `/etc/opt/chrome/policies/managed/`, for example
  `debug-capture.json`:

  ```json
  {
    "DownloadDirectory": "/var/debug-captures",
    "PromptForDownloadLocation": false,
    "AutomaticDownloadsAllowedForUrls": ["https://app.local"]
  }
  ```

Then open `chrome://policy` on the station and check the values are there.

Good to know: `DownloadDirectory` applies to **every** download in that Chrome,
not only this tool's files, and the user cannot change it. To only *suggest* the
folder, use `DefaultDownloadDirectory` instead. The files are named
`debug-capture-<date>-<time>.json`, so they never overwrite each other.

---

## 2. What was added to this app

Only **five things**. Nothing else in the app knows the panel exists.

| # | File | What it is |
| --- | --- | --- |
| 1 | `vendor/debug-capture-2.2.0-alpha.2.tgz` | The package itself, as one file. This is the file you carry into the air-gapped network. |
| 2 | `package.json` | One line in `dependencies`: `"debug-capture": "file:vendor/debug-capture-2.2.0-alpha.2.tgz"`. `npm install` reads the package from that file — no internet needed. (`package-lock.json` changes with it.) |
| 3 | `src/app/features/debug-panel/` | The only code that imports the package: `startDebugPanel()` and `provideDebugPanel()`, plus a small spec. |
| 4 | `src/main.ts` | Calls `startDebugPanel()` **before** Angular starts, waits for its `ready`, and passes its `providers` to `platformBrowserDynamic(…)`. |
| 5 | `src/app/app.module.ts` | Adds `provideDebugPanel()` to `providers`. |

Why each piece:

- **`startDebugPanel()` runs before Angular starts, and Angular waits for its
  `ready`.** So when the page starts switched on (`?debug=1`, or the shortcut
  was pressed before), the very first requests are recorded too. When it is
  off, `ready` is done at once: no delay. It also means the shortcut still works
  if Angular fails to start — which is exactly when you need it most.
- **`provideDebugPanel()`** replaces Angular's error handler with one that also
  records the error. It still prints the error to the console, like before. It
  finds the recording even when it was switched on after Angular started.
- **Almost nothing loads until it is turned on.** At start-up the app has only
  a tiny piece (about 1 kB, gzipped): one key listener. Recording and the panel
  loader (about 15 kB) load when it is turned on; the panel's screens (about
  40 kB) the first time someone opens it. (Measured in this app: the start
  bundle shrank by about 13 kB gzipped compared with 2.1.)

> The old recorder (v1) is still in the repo, in `src/debug-capture/` and
> `src/app/features/debug-capture/`, but the app no longer uses it. It can be
> deleted later in its own change. Do not wire both: the new one refuses to
> start while another capture is running.

---

## 3. How to add it to another Angular app

Works with Angular 16 to 20. You need Node 20.19+, 22.13+ or 24+.

### Step 1 — Put the package file in the app

Copy `debug-capture-2.2.0-alpha.2.tgz` into a `vendor/` folder at the root of
the app (next to `package.json`).

```
my-app/
  package.json
  vendor/
    debug-capture-2.2.0-alpha.2.tgz
  src/
```

### Step 2 — Install it

From the app's root folder:

```bash
npm install ./vendor/debug-capture-2.2.0-alpha.2.tgz
```

Check `package.json`. You should now see this line in `dependencies`:

```json
"debug-capture": "file:vendor/debug-capture-2.2.0-alpha.2.tgz"
```

Commit the `.tgz` file, `package.json` and `package-lock.json` together. From
now on a plain `npm install` (or `npm ci`) installs the panel from the file.

### Step 3 — Copy the wiring folder

Copy the folder `src/app/features/debug-panel/` from this repo into the same
place in your app. It has three files:

- `debug-panel.ts` — the code (about 30 lines),
- `index.ts` — exports the two functions,
- `debug-panel.spec.ts` — a small test (optional).

This is what `debug-panel.ts` does:

```ts
export function startDebugPanel(): DebugPanelStart {
  const activation = installDebugActivation(); // the shortcut and the flags; loads the rest when on
  return {
    providers: [provideDebugCaptureSession(() => activation.session)], // read on each error
    ready: activation.ready, // done once a page that starts switched on is recording
    activation,
  };
}

export function provideDebugPanel(): Provider[] {
  return provideDebugCapture(); // records errors Angular catches
}
```

### Step 4 — Call it in `main.ts`

Add the import, call `startDebugPanel()` **before** bootstrap, start Angular
after its `ready`, and pass its `providers` to `platformBrowserDynamic`:

```ts
import { startDebugPanel } from './app/features/debug-panel';

const debugPanel = startDebugPanel();

debugPanel.ready
  .then(() => platformBrowserDynamic(debugPanel.providers).bootstrapModule(AppModule))
  .catch(err => console.error(err));
```

If your `platformBrowserDynamic([...])` already has providers, add them
together: `platformBrowserDynamic([...yourProviders, ...debugPanel.providers])`.

**Standalone app** (`bootstrapApplication` instead of an `AppModule`)? Then put
both in the app's providers:

```ts
const debugPanel = startDebugPanel();
debugPanel.ready.then(() =>
  bootstrapApplication(AppComponent, {
    providers: [...debugPanel.providers, provideDebugPanel() /* , your providers */],
  }),
);
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

1. Open the app. Nothing shows, and `Ctrl+Alt+Shift+P` does nothing (it is off).
2. Press `Ctrl+Alt+Shift+A`. Still nothing shows — that is right.
3. Press `Ctrl+Alt+Shift+P`. The panel opens and shows the app's requests.
4. Reload. Press `Ctrl+Alt+Shift+P`: the requests from the start of the page are there.
5. Press `Ctrl+Alt+Shift+A` to turn it off again. Also try `?debug=1` once.

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
   `const debugPanel = startDebugPanel();` line, and change
   `debugPanel.ready.then(() => platformBrowserDynamic(debugPanel.providers).bootstrapModule(AppModule))`
   back to `platformBrowserDynamic().bootstrapModule(AppModule)`.
2. In `src/app/app.module.ts`, delete the `provideDebugPanel` import and the
   `provideDebugPanel(),` line in `providers`.
3. Delete the folder `src/app/features/debug-panel/`.
4. Uninstall the package and delete its file:

   ```bash
   npm uninstall debug-capture
   rm vendor/debug-capture-2.2.0-alpha.2.tgz
   ```

5. Build to check nothing else used it: `npm run build`.

---

## 6. Questions and problems

**I turned it on but there is no DBG button.**
After the shortcut that is on purpose: it runs with no visible sign. Press
`Ctrl+Alt+Shift+P` to open the panel, or show the button in Settings › DBG
button. With `?debug=1` the button should show: reload the page after changing
the URL (the flag is read once, at start), check the address really has
`?debug=1` (or `&debug=1` after other parameters), and check Settings › DBG
button is not on Hide (that choice is remembered).

**Is it on or off right now?**
Press `Ctrl+Alt+Shift+P`. If the panel opens, it is on. (Pressing
`Ctrl+Alt+Shift+A` to check would switch it.)

**Can anyone at the station turn it on?**
Yes — anyone who knows the shortcut. That is a known, open question (HLD
`OPEN-05`). A developer can change the shortcut in code, or turn the shortcut
off and keep only `?debug=1`.

**The shortcut does nothing.**
Click inside the page first, so it has keyboard focus. The keys are matched by
position on the keyboard, so they also work with a Hebrew keyboard layout.

**The panel is on screen but I cannot click it.**
The app is in fullscreen, or it shows a modal dialog. The browser blocks clicks
outside that dialog. Leave fullscreen or close the dialog; the panel says so in a
banner.

**Does it slow the app down when it is off?**
No. Nothing is patched or recorded. At start-up the app runs one key listener
and reads one browser setting; that is all.

**Does it send data anywhere?**
No. The panel never makes network requests. Copy and export happen only when
someone clicks.

**Which browsers?**
Chrome 146 or newer.

**More detail** (all options, the keyboard map, the file format): see
[`packages/debug-capture/README.md`](../packages/debug-capture/README.md).
