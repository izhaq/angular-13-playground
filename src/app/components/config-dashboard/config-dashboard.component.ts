import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { DropdownOption } from '../app-dropdown/app-dropdown.models';
import { DashboardState, LeftPanelPayload } from './models/dashboard.models';
import { DashboardViewModel } from './models/dashboard-view.model';
import { GridConfig, RowViewModel } from './components/status-grid/grid.models';
import { buildAbbrLookup } from './components/status-grid/abbr-lookup';
import { buildGridRowDefs } from './components/status-grid/grid-defaults';
import { DashboardStateService } from './services/dashboard-state.service';
import { StatusGridService } from './components/status-grid/status-grid.service';
import { OPERATIONS_FIELDS } from './components/operations-list/operations-list.models';
import { CMD_TEST_FIELDS } from './components/cmd-test-panel/cmd-test-panel.models';
import { SCENARIOS, DEFAULT_GRID_CONFIG } from '../../mocks/mock-data';

@Component({
  selector: 'app-config-dashboard',
  templateUrl: './config-dashboard.component.html',
  styleUrls: ['./config-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [StatusGridService],
})
export class ConfigDashboardComponent implements OnInit, OnDestroy {
  readonly scenarioOptions: DropdownOption[] = SCENARIOS;
  readonly gridConfig: GridConfig = DEFAULT_GRID_CONFIG;
  readonly dashboardView$: Observable<DashboardViewModel>;
  readonly gridRows$: Observable<RowViewModel[]>;

  constructor(
    private readonly stateService: DashboardStateService,
    private readonly gridService: StatusGridService,
  ) {
    this.dashboardView$ = this.stateService.state$.pipe(
      map((state) => ({
        state,
        isRealtime: state.scenario === 'realtime',
      })),
    );
    this.gridRows$ = this.gridService.gridRows$;
  }

  ngOnInit(): void {
    const allFields = [...OPERATIONS_FIELDS, ...CMD_TEST_FIELDS];
    this.gridService.configure(
      DEFAULT_GRID_CONFIG.columns,
      buildAbbrLookup(allFields),
      buildGridRowDefs(),
    );
    this.gridService.connect();
  }

  ngOnDestroy(): void {
    this.gridService.disconnect();
  }

  onScenarioChanged(value: string, currentState: DashboardState): void {
    this.stateService.updateState({ ...currentState, scenario: value });
  }

  onDefault(): void {
    this.stateService.resetToDefaults();
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
      cmd: partial.cmd,
      operations: partial.operations,
      cmdTest: partial.cmdTest,
    };
  }
}
