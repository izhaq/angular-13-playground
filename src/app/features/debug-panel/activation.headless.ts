import { DebugActivationHandle, installDebugActivation } from 'debug-capture/activate-headless';

import type { DebugPanelMode } from './mode';

/**
 * Option B — headless (`--configuration headless`). Capture and export work the
 * same, but there is no panel and none of its code is in the bundle. The user
 * saves the capture with Ctrl+Alt+Shift+D and stops / starts recording with
 * Ctrl+Alt+Shift+S. Replaces activation.ts in that build (angular.json).
 */
export const DEBUG_PANEL_MODE: DebugPanelMode = 'headless';

export function installActivation(): DebugActivationHandle {
  return installDebugActivation();
}
