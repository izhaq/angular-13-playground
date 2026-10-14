import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { environment } from '../environments/environment';
import { DemoPageComponent } from './demo/demo-page.component';
import { authGuard } from './features/auth/auth.guard';
import { LOGIN_PATH } from './features/auth/auth-urls';

/**
 * Top-level routes for the playground.
 *
 *   /              → redirects to /system-experiments (the headline screen)
 *   /login         → login page (standalone component, lazy via loadComponent)
 *                    — only when auth is enabled
 *   /demo          → component playground (DemoPageComponent, eager)
 *   /system-experiments    → SYS Mode dashboard host page (lazy-loaded),
 *                    behind authGuard only when auth is enabled
 *
 * System Experiments is lazy-loaded so its mock-backend providers and the page
 * module's RouterModule.forChild route scope to the page injector — no
 * leakage into the demo page or the root app, and mirrors what a real
 * host project would do (lazy feature route + per-page providers).
 *
 * Built by a function so both auth settings are testable; the app uses
 * `environment.authEnabled`. With auth off, `/login` is not registered and
 * falls through to the wildcard, so nothing can land on the login page.
 */
export function buildRoutes(authEnabled: boolean): Routes {
  return [
    { path: '', redirectTo: '/system-experiments', pathMatch: 'full' },
    ...(authEnabled
      ? [
          {
            // The feature's own constant — keeps the registered route and the
            // guard's redirect target (LOGIN_URL) from ever drifting apart.
            path: LOGIN_PATH,
            loadComponent: () =>
              import('./features/auth/login-page/login-page.component')
                .then((m) => m.LoginPageComponent),
          },
        ]
      : []),
    { path: 'demo', component: DemoPageComponent },
    {
      path: 'system-experiments',
      canActivate: authEnabled ? [authGuard] : [],
      loadChildren: () =>
        import('./pages/system-experiments/system-experiments-page.module')
          .then((m) => m.SystemExperimentsPageModule),
    },
    { path: '**', redirectTo: '/system-experiments' },
  ];
}

@NgModule({
  imports: [RouterModule.forRoot(buildRoutes(environment.authEnabled))],
  exports: [RouterModule],
})
export class AppRoutingModule {}
