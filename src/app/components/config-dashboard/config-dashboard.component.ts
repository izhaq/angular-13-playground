import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DropdownOption } from '../app-dropdown/app-dropdown.models';
import { DashboardState, LeftPanelPayload } from './models/dashboard.models';
import { DashboardStateService } from './services/dashboard-state.service';
import { StatusGridService } from './services/status-grid.service';
import { SCENARIOS } from '../../mocks/mock-data';

interface DashboardViewModel {
  state: DashboardState;
  isRealtime: boolean;
}

@Component({
  selector: 'app-config-dashboard',
  templateUrl: './config-dashboard.component.html',
  styleUrls: ['./config-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigDashboardComponent implements OnInit, OnDestroy {
  readonly scenarioOptions: DropdownOption[] = SCENARIOS;
  readonly vm$: Observable<DashboardViewModel>;

  constructor(
    private readonly stateService: DashboardStateService,
    private readonly gridService: StatusGridService,
  ) {
    this.vm$ = this.stateService.state$.pipe(
      map((state) => ({
        state,
        isRealtime: state.scenario === 'realtime',
      })),
    );
  }

  ngOnInit(): void {
    this.gridService.connect();
  }

  ngOnDestroy(): void {
    this.gridService.disconnect();
  }

  onScenarioChanged(value: string, currentState: DashboardState): void {
    this.stateService.updateState({ ...currentState, scenario: value });
  }

  onReset(): void {
    this.stateService.resetToDefaults();
    this.gridService.resetToDefaults();
  }

  onStateChanged(partial: LeftPanelPayload, scenario: string): void {
    this.stateService.updateState(this.buildState(partial, scenario));
  }

  onSaved(partial: LeftPanelPayload, scenario: string): void {
    this.stateService.saveConfig(this.buildState(partial, scenario));
  }

  onCancelled(): void {
    this.stateService.cancelChanges();
  }

  private buildState(partial: LeftPanelPayload, scenario: string): DashboardState {
    return {
      scenario,
      driveCommand: partial.driveCommand,
      vehicleControls: partial.vehicleControls,
    };
  }
}
