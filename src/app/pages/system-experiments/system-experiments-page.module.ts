import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SystemExperimentsModule } from '../../features/system-experiments/system-experiments.module';

import { SystemExperimentsPageComponent } from './system-experiments-page.component';
import { LIVE_SYSTEM_EXPERIMENTS_PROVIDERS } from './system-experiments-live.providers';

const routes: Routes = [
  { path: '', component: SystemExperimentsPageComponent },
];

/**
 * Page module for the SYS Mode dashboard. Imports the feature module,
 * wires the local Node server (`server/`) as the backend, and registers
 * its single route so the host app can lazy-load (or eager-load) it
 * without dragging the demo playground in alongside.
 *
 * Backend toggle:
 *   - LIVE  → `LIVE_SYSTEM_EXPERIMENTS_PROVIDERS` (this file). Talks to the
 *             Node server at http://localhost:3000. Run alongside
 *             `ng serve` with `npm run server:start`.
 *   - MOCK  → `MOCK_SYSTEM_EXPERIMENTS_PROVIDERS` from
 *             `system-experiments-mock.providers.ts`. Offline canned data, no
 *             realtime updates. Swap in if the server is not running.
 *
 * **Migration:** the host project keeps `SystemExperimentsModule` and the page
 * shell, but drops these playground providers and supplies its own
 * `SYSTEM_EXPERIMENTS_API_CONFIG` (real URLs) instead. The shell mounts unchanged.
 */
@NgModule({
  declarations: [SystemExperimentsPageComponent],
  imports: [
    CommonModule,
    SystemExperimentsModule,
    RouterModule.forChild(routes),
  ],
  providers: [...LIVE_SYSTEM_EXPERIMENTS_PROVIDERS],
})
export class SystemExperimentsPageModule {}
