import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DemoPageComponent } from './demo/demo-page.component';

/**
 * Top-level routes for the playground.
 *
 *   /              → redirects to /engine-sim (the headline screen)
 *   /demo          → component playground (DemoPageComponent, eager)
 *   /engine-sim    → SYS Mode dashboard host page (lazy-loaded)
 *
 * Engine Sim is lazy-loaded so its mock-backend providers and the page
 * module's RouterModule.forChild route scope to the page injector — no
 * leakage into the demo page or the root app, and mirrors what a real
 * host project would do (lazy feature route + per-page providers).
 */
const routes: Routes = [
  { path: '', redirectTo: '/engine-sim', pathMatch: 'full' },
  { path: 'demo', component: DemoPageComponent },
  {
    path: 'engine-sim',
    loadChildren: () =>
      import('./pages/engine-sim/engine-sim-page.module')
        .then((m) => m.EngineSimPageModule),
  },
  { path: '**', redirectTo: '/engine-sim' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
