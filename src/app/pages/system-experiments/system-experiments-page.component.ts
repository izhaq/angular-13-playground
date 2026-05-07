import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Host page for the System Experiments dashboard.
 *
 * Mirrors what the migration target page will look like: a single screen
 * that mounts `<system-experiments-shell>` inside the spec's 1150 × 550 envelope.
 * The shell stays unaware of its container — the page owns sizing and
 * surrounding chrome (page title, breadcrumbs, etc. as the real host
 * needs them).
 *
 * Backend services are mocked at the module level (see
 * `SystemExperimentsPageModule` providers) so the playground works offline. In
 * the migration target, those overrides go away and `SystemExperimentsModule`'s
 * default services + the host's real `SYSTEM_EXPERIMENTS_API_CONFIG` take over.
 */
@Component({
  selector: 'app-system-experiments-page',
  templateUrl: './system-experiments-page.component.html',
  styleUrls: ['./system-experiments-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemExperimentsPageComponent {}
