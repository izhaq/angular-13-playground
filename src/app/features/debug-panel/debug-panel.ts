import { Provider, StaticProvider } from '@angular/core';
import { createCaptureController, isDebugRequested } from 'debug-capture';
import { provideDebugCapture, provideDebugCaptureSession } from 'debug-capture/angular';
import { installDebugPanel } from 'debug-capture/panel';

/**
 * The on-screen debug panel (package `debug-capture`, v2). Every import from
 * the package lives in this folder, so the app touches it in only two places:
 * `startDebugPanel()` in main.ts and `provideDebugPanel()` in AppModule.
 * See docs/debug-panel.md (how to turn it on, use it, and remove it).
 *
 * Off by default: without `?debug=1` in the URL (or `debug-capture` = `1` in
 * localStorage) nothing is patched and no panel is added.
 */

/**
 * Call once in main.ts, before bootstrap, so the app's first requests are
 * recorded too. Returns the platform providers that hand the capture session
 * to Angular (`null` when the flag is off).
 */
export function startDebugPanel(): StaticProvider[] {
  const controller = isDebugRequested() ? createCaptureController() : null;
  // Adds the launcher and the Ctrl+Alt+Shift+P shortcut; the panel UI loads on first open.
  installDebugPanel(controller);
  return [provideDebugCaptureSession(controller?.session ?? null)];
}

/** In AppModule `providers`: errors Angular catches itself are recorded too. Harmless when the flag is off. */
export function provideDebugPanel(): Provider[] {
  return provideDebugCapture();
}
