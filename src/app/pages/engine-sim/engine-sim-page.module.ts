import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { EngineSimModule } from '../../features/engine-sim/engine-sim.module';

import { EngineSimPageComponent } from './engine-sim-page.component';
import { MOCK_ENGINE_SIM_PROVIDERS } from './engine-sim-mock.providers';

const routes: Routes = [
  { path: '', component: EngineSimPageComponent },
];

/**
 * Page module for the SYS Mode dashboard. Imports the feature module,
 * supplies playground-only mock backend providers, and registers its
 * single route so the host app can lazy-load (or eager-load) it without
 * dragging the demo playground in alongside.
 *
 * **Migration:** the host project keeps `EngineSimModule` and the page
 * shell, but drops `MOCK_ENGINE_SIM_PROVIDERS` (mock backend) and
 * supplies its own `ENGINE_SIM_API_CONFIG` instead. The shell mounts
 * unchanged.
 */
@NgModule({
  declarations: [EngineSimPageComponent],
  imports: [
    CommonModule,
    EngineSimModule,
    RouterModule.forChild(routes),
  ],
  providers: [...MOCK_ENGINE_SIM_PROVIDERS],
})
export class EngineSimPageModule {}
