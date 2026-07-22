import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, Router } from '@angular/router';

import { AUTH_ROUTES_CONFIG, Mode, Position } from '../auth-contract';
import { SessionStore } from '../session.store';

/**
 * Every failure the contract defines has a face — one honest, human message
 * per cause, wording free of blame and jargon.
 */
type LoginErrorKind = 'invalid-credentials' | 'locked' | 'unreachable' | 'unknown';

const LOGIN_ERROR_MESSAGES: Record<LoginErrorKind, string> = {
  'invalid-credentials': 'Wrong username or password. Please check and try again.',
  locked: 'This account is locked right now. Please try again later.',
  unreachable: 'Cannot reach the server right now. Please try again in a moment.',
  unknown: 'Something went wrong while signing in. Please try again.',
};

/**
 * Maps a login failure to its message key:
 * - 401 → the contract's invalid_credentials.
 * - 423 → the contract's reserved locked state (never sent by the reference
 *   server yet, but the client must already render it distinctly).
 * - status 0 (no connection) or 5xx (server broken) → unreachable.
 * - anything else → an honest generic fallback.
 */
function classifyLoginError(error: unknown): LoginErrorKind {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401) {
      return 'invalid-credentials';
    }
    if (error.status === 423) {
      return 'locked';
    }
    if (error.status === 0 || error.status >= 500) {
      return 'unreachable';
    }
  }
  return 'unknown';
}

/**
 * Standalone login page. On success navigates to the returnUrl query param
 * (set by the guard or the 401 interceptor) or the host-configured default
 * post-login route (see AUTH_ROUTES_CONFIG / auth-urls.ts).
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule, MatButtonModule, MatButtonToggleModule],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly store = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routeUrls = inject(AUTH_ROUTES_CONFIG);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    mode: this.fb.control<Mode>('operation'),
    position: this.fb.control<Position>('active'),
  });

  /** True while the login request is in flight — disables submit, shows the spinner. */
  readonly pending = signal(false);

  private readonly error = signal<LoginErrorKind | null>(null);

  /** The inline error message, or null when there is nothing to show. */
  readonly errorMessage = computed(() => {
    const kind = this.error();
    return kind === null ? null : LOGIN_ERROR_MESSAGES[kind];
  });

  constructor() {
    // A stale error under a corrected form misleads — any edit clears it.
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.error.set(null));
  }

  submit(): void {
    if (this.pending()) {
      return; // In flight — the disabled button already blocks clicks; this blocks Enter too.
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.error.set(null);
    this.store.login(this.form.getRawValue()).subscribe({
      next: () => {
        // Allowlist: only app-relative targets. Anything else (absolute
        // URLs, protocol-relative '//host' URLs, garbage) falls back to the
        // default post-login route — a crafted ?returnUrl= must never steer
        // the user off the app.
        // pending stays true on purpose: the page is about to be left, and
        // re-enabling would invite a double submit during navigation.
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(
          returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
            ? returnUrl
            : this.routeUrls.defaultPostLoginUrl,
        );
      },
      error: (error: unknown) => {
        this.pending.set(false);
        this.error.set(classifyLoginError(error));
      },
    });
  }

  showRequiredError(name: 'username' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }
}
