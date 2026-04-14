import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { DropdownOption } from '../../../app-dropdown/app-dropdown.models';
import { WsService } from '../../services/ws.service';
import { SCENARIOS } from '../../../../mocks/mock-data';

@Component({
  selector: 'app-dashboard-wrapper',
  templateUrl: './dashboard-wrapper.component.html',
  styleUrls: ['./dashboard-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [WsService],
})
export class DashboardWrapperComponent implements OnInit, OnDestroy {
  readonly scenarioOptions: DropdownOption[] = SCENARIOS;

  private readonly scenarioSubject = new BehaviorSubject<string>('highway-cruise');
  readonly scenario$ = this.scenarioSubject.asObservable();
  readonly isRealtime$ = this.scenario$.pipe(map((s) => s === 'realtime'));

  constructor(private readonly wsService: WsService) {}

  get selectedScenario(): string {
    return this.scenarioSubject.getValue();
  }

  ngOnInit(): void {
    this.wsService.connect();
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }

  onScenarioChanged(value: string): void {
    this.scenarioSubject.next(value);
  }
}
