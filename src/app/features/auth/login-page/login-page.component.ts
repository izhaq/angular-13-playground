import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, Router } from '@angular/router';

import { Mode, Position } from '../auth-contract';
import { SessionStore } from '../session.store';

/**
 * Standalone login page. On success navigates to the returnUrl query param
 * (set by the guard in slice 2) or the app's home screen. Error UX beyond a
 * single generic message arrives in slice 4.
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
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    mode: this.fb.control<Mode>('operation'),
    position: this.fb.control<Position>('active'),
  });

  readonly loginFailed = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginFailed.set(false);
    this.store.login(this.form.getRawValue()).subscribe({
      next: () => {
        // Allowlist: only app-relative targets. Anything else (absolute
        // URLs, garbage) falls back to the home screen — a crafted
        // ?returnUrl= must never steer the user off the app.
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(
          returnUrl?.startsWith('/') ? returnUrl : '/system-experiments',
        );
      },
      error: () => this.loginFailed.set(true),
    });
  }

  showRequiredError(name: 'username' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }
}
