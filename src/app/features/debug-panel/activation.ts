import { DebugActivationHandle, installDebugActivation } from 'debug-capture/activate';

import type { DebugPanelMode } from './mode';

/**
 * Option A — with the panel (the default build). The panel is in the bundle and
 * opens with Ctrl+Alt+Shift+P once the tool is switched on.
 *
 * This file is one of three; the build picks one (angular.json `fileReplacements`):
 *   activation.ts           A  with the panel            ng serve / ng build
 *   activation.headless.ts  B  no panel, no panel code   --configuration headless
 *   activation.flag.ts      C  the backend decides       --configuration panel-flag
 * Option D (per build) is these configurations: e.g. a customer build is
 * `ng build --configuration production,headless`. See docs/debug-panel.md.
 */
export const DEBUG_PANEL_MODE: DebugPanelMode = 'panel';

export function installActivation(): DebugActivationHandle {
  return installDebugActivation();
}
