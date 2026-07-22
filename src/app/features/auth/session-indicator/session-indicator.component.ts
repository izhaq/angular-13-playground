import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { LOGIN_URL } from '../auth-urls';
import { SessionStore } from '../session.store';

/**
 * Logged-in session chrome: "username · mode" plus a logout button, wired to
 * the SessionStore. Renders nothing while logged out, so a host can place it
 * unconditionally (e.g. in its toolbar) and forget about it — no inputs, no
 * outputs, no conditions to wire.
 */
@Component({
  selector: 'auth-session-indicator',
  standalone: true,
  imports: [NgIf],
  templateUrl: './session-indicator.component.html',
  styleUrls: ['./session-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionIndicatorComponent {
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
