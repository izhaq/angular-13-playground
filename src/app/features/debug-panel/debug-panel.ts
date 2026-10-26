import { Provider, StaticProvider } from '@angular/core';
import type { AppMessageLevel } from 'debug-capture';
import { DebugActivationHandle, installDebugActivation } from 'debug-capture/activate';
import { provideDebugCapture, provideDebugCaptureSession } from 'debug-capture/angular';

/**
 * The on-screen debug panel (package `debug-capture`, v2). Every import from
 * the package lives in this folder, so the app touches it in only two places:
 * `startDebugPanel()` in main.ts and `provideDebugPanel()` in AppModule.
 * See docs/debug-panel.md (how to turn it on, use it, and remove it).
 *
 * Off by default. Two ways turn it on: `?debug=1` in the URL (this page load),
 * or the shortcut Ctrl+Alt+Shift+A (remembered in this browser; press it again
 * to turn it off for good). Until then only a tiny key listener runs; capture
 * and the panel are loaded when it is turned on.
 */

/** What main.ts needs from `startDebugPanel()`. */
export interface DebugPanelStart {
  /** Platform providers: Angular's error handler reads the session through them (null while off). */
  readonly providers: StaticProvider[];
  /** Resolves when a page that starts switched on is recording; at once when it is off. Never rejects. */
  readonly ready: Promise<void>;
  /** The activation handle (on / off, the session), for the app's own use. */
  readonly activation: DebugActivationHandle;
}

/**
 * Call once in main.ts, before bootstrap, and bootstrap after `ready`, so the
 * app's first requests are recorded too when it starts switched on.
 */
export function startDebugPanel(): DebugPanelStart {
  const activation = installDebugActivation();
  current = activation;
  return {
    // A getter: the session may start after bootstrap (the shortcut).
    providers: [provideDebugCaptureSession(() => activation.session)],
    ready: activation.ready,
    activation,
  };
}

/** The handle `startDebugPanel()` made; `debugMessage()` sends through it. */
let current: DebugActivationHandle | null = null;

/**
 * Sends the app's own message to the debug panel: a short type name, any data,
 * and a level (`'info'` by default, `'warn'` or `'error'` — an error counts as
 * a problem). Saved with everything else and in the exported file. Safe to
 * call any time: while the panel is off it is dropped and costs nothing.
 */
export function debugMessage(type: string, data?: unknown, level?: AppMessageLevel): void {
  current?.message(type, data, level);
}

/** In AppModule `providers`: errors Angular catches itself are recorded too. Harmless when it is off. */
export function provideDebugPanel(): Provider[] {
  return provideDebugCapture();
}
