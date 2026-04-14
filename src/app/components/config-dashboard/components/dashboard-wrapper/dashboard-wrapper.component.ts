import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';
import { SCENARIOS } from '../../../../mocks/mock-data';

@Component({
  selector: 'app-dashboard-wrapper',
  templateUrl: './dashboard-wrapper.component.html',
  styleUrls: ['./dashboard-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardWrapperComponent {
  readonly scenarioOptions: DropdownOption[] = SCENARIOS;

  private readonly scenarioSubject = new BehaviorSubject<string>('highway-cruise');
  readonly scenario$ = this.scenarioSubject.asObservable();
  readonly isRealtime$ = this.scenario$.pipe(map((s) => s === 'realtime'));

  get selectedScenario(): string {
    return this.scenarioSubject.getValue();
  }

  onScenarioChanged(value: string): void {
    this.scenarioSubject.next(value);
  }
}
