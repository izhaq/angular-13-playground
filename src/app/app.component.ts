import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { LOGIN_URL } from './features/auth/auth-urls';
import { SessionStore } from './features/auth/session.store';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  /**
   * Store first, navigation second — logout() always completes (even with
   * the server down), so the user always lands back on the login page.
   */
  protected logout(): void {
    this.store.logout().subscribe(() => this.router.navigateByUrl(LOGIN_URL));
  }
}
