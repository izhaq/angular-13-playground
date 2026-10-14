import { ChangeDetectionStrategy, Component } from '@angular/core';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  /** With auth off the user badge is not mounted, so the auth feature is never instantiated. */
  readonly authEnabled: boolean = environment.authEnabled;
}
