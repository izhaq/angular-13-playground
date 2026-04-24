import { SystemExperimentsApiConfig } from '../../features/system-experiments/api/api-contract';
import { SYSTEM_EXPERIMENTS_API_CONFIG } from '../../features/system-experiments/api/api-tokens';

/**
 * Live backend wiring for the playground page.
 *
 * Points the feature at the local Node server (`server/`):
 *   - HTTP: http://localhost:3000/api/system-experiments/{primary,secondary,get}
 *   - WS:   ws://localhost:3000/api/system-experiments/ws
 *
 * Run the server alongside `ng serve` with `npm run server:start`. Open
 * two browser tabs to the page to watch one client's POSTs flow into the
 * other's grid in real time.
 *
 * Default services (`SystemExperimentsApiService`, `SystemExperimentsDataService`) come
 * from `SystemExperimentsModule`. The mock providers next to this file remain
 * available for offline work — swap them in if the server is not running.
 */

const HTTP_BASE = 'http://localhost:3000';
const WS_BASE = 'ws://localhost:3000';

export const LIVE_SYSTEM_EXPERIMENTS_API_CONFIG: SystemExperimentsApiConfig = {
  primaryPostUrl:   `${HTTP_BASE}/api/system-experiments/primary`,
  secondaryPostUrl: `${HTTP_BASE}/api/system-experiments/secondary`,
  getUrl:           `${HTTP_BASE}/api/system-experiments/get`,
  wsUrl:            `${WS_BASE}/api/system-experiments/ws`,
};

export const LIVE_SYSTEM_EXPERIMENTS_PROVIDERS = [
  { provide: SYSTEM_EXPERIMENTS_API_CONFIG, useValue: LIVE_SYSTEM_EXPERIMENTS_API_CONFIG },
];
