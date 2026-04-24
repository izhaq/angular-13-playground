import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { EngineSimModule } from '../../features/engine-sim/engine-sim.module';

import { EngineSimPageComponent } from './engine-sim-page.component';
import { LIVE_ENGINE_SIM_PROVIDERS } from './engine-sim-live.providers';

const routes: Routes = [
  { path: '', component: EngineSimPageComponent },
];

/**
 * Page module for the SYS Mode dashboard. Imports the feature module,
 * wires the local Node server (`server/`) as the backend, and registers
 * its single route so the host app can lazy-load (or eager-load) it
 * without dragging the demo playground in alongside.
 *
 * Backend toggle:
 *   - LIVE  → `LIVE_ENGINE_SIM_PROVIDERS` (this file). Talks to the
 *             Node server at http://localhost:3000. Run alongside
 *             `ng serve` with `npm run server:start`.
 *   - MOCK  → `MOCK_ENGINE_SIM_PROVIDERS` from
 *             `engine-sim-mock.providers.ts`. Offline canned data, no
 *             realtime updates. Swap in if the server is not running.
 *
 * **Migration:** the host project keeps `EngineSimModule` and the page
 * shell, but drops these playground providers and supplies its own
 * `ENGINE_SIM_API_CONFIG` (real URLs) instead. The shell mounts unchanged.
 */
@NgModule({
  declarations: [EngineSimPageComponent],
  imports: [
    CommonModule,
    EngineSimModule,
    RouterModule.forChild(routes),
  ],
  providers: [...LIVE_ENGINE_SIM_PROVIDERS],
})
export class EngineSimPageModule {}
