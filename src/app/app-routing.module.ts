import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DemoPageComponent } from './demo/demo-page.component';

/**
 * Top-level routes for the playground.
 *
 *   /              → redirects to /system-experiments (the headline screen)
 *   /demo          → component playground (DemoPageComponent, eager)
 *   /system-experiments    → SYS Mode dashboard host page (lazy-loaded)
 *
 * System Experiments is lazy-loaded so its mock-backend providers and the page
 * module's RouterModule.forChild route scope to the page injector — no
 * leakage into the demo page or the root app, and mirrors what a real
 * host project would do (lazy feature route + per-page providers).
 */
const routes: Routes = [
  { path: '', redirectTo: '/system-experiments', pathMatch: 'full' },
  { path: 'demo', component: DemoPageComponent },
  {
    path: 'system-experiments',
    loadChildren: () =>
      import('./pages/system-experiments/system-experiments-page.module')
        .then((m) => m.SystemExperimentsPageModule),
  },
  { path: '**', redirectTo: '/system-experiments' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
