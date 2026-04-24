import { EngineSimApiConfig } from '../../features/engine-sim/api/api-contract';
import { ENGINE_SIM_API_CONFIG } from '../../features/engine-sim/api/api-tokens';

/**
 * Live backend wiring for the playground page.
 *
 * Points the feature at the local Node server (`server/`):
 *   - HTTP: http://localhost:3000/api/engine-sim/{primary,secondary,get}
 *   - WS:   ws://localhost:3000/api/engine-sim/ws
 *
 * Run the server alongside `ng serve` with `npm run server:start`. Open
 * two browser tabs to the page to watch one client's POSTs flow into the
 * other's grid in real time.
 *
 * Default services (`EngineSimApiService`, `EngineSimDataService`) come
 * from `EngineSimModule`. The mock providers next to this file remain
 * available for offline work — swap them in if the server is not running.
 */

const HTTP_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3000';

export const LIVE_ENGINE_SIM_API_CONFIG: EngineSimApiConfig = {
  primaryPostUrl:   `${HTTP_BASE}/api/engine-sim/primary`,
  secondaryPostUrl: `${HTTP_BASE}/api/engine-sim/secondary`,
  getUrl:           `${HTTP_BASE}/api/engine-sim/get`,
  wsUrl:            `${WS_BASE}/api/engine-sim/ws`,
};

export const LIVE_ENGINE_SIM_PROVIDERS = [
  { provide: ENGINE_SIM_API_CONFIG, useValue: LIVE_ENGINE_SIM_API_CONFIG },
];
