import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Host page for the Engine Sim dashboard.
 *
 * Mirrors what the migration target page will look like: a single screen
 * that mounts `<engine-sim-shell>` inside the spec's 1150 × 550 envelope.
 * The shell stays unaware of its container — the page owns sizing and
 * surrounding chrome (page title, breadcrumbs, etc. as the real host
 * needs them).
 *
 * Backend services are mocked at the module level (see
 * `EngineSimPageModule` providers) so the playground works offline. In
 * the migration target, those overrides go away and `EngineSimModule`'s
 * default services + the host's real `ENGINE_SIM_API_CONFIG` take over.
 */
@Component({
  selector: 'app-engine-sim-page',
  templateUrl: './engine-sim-page.component.html',
  styleUrls: ['./engine-sim-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineSimPageComponent {}
