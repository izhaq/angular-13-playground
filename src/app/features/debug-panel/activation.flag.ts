import { DebugActivationHandle, DebugPanelChoice, installDebugActivation } from 'debug-capture/activate';

import type { DebugPanelMode } from './mode';

/**
 * Option C — the panel ships, and the backend decides (`--configuration panel-flag`).
 * At each switch-on, after capture has started, it asks the server
 * (`GET /api/features`, server/src/index.ts). `debugPanel: true` installs the
 * panel; anything else, an error or no answer gives none, and capture keeps
 * running. Replaces activation.ts in that build (angular.json).
 */
export const DEBUG_PANEL_MODE: DebugPanelMode = 'flag';

/** Where the flag comes from. `fetch`, not HttpClient: this runs before Angular starts. */
export const FEATURES_URL = '/api/features';

/** The backend's answer as a panel choice: `{}` (a panel) only for `debugPanel: true`. */
export function panelFromBackend(load: typeof fetch = (input, init) => fetch(input, init)): Promise<DebugPanelChoice> {
  return load(FEATURES_URL)
    .then((response) => (response.ok ? response.json() : null))
    .then((features: { debugPanel?: unknown } | null) => (features?.debugPanel === true ? {} : false));
}

export function installActivation(): DebugActivationHandle {
  return installDebugActivation({ panel: () => panelFromBackend() });
}
