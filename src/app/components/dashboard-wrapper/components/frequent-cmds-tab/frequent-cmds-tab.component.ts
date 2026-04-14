import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { DashboardState, LeftPanelPayload } from './models/dashboard.models';
import { GridConfig, RowViewModel } from '../status-grid/models/grid.models';
import { buildAbbrLookup } from '../status-grid/models/abbr-lookup';
import { buildGridRowDefs } from '../status-grid/models/grid-defaults';
import { DashboardStateService } from './services/dashboard-state.service';
import { WsService } from '../../services/ws.service';
import { StatusGridService } from '../status-grid/services/status-grid.service';
import { OPERATIONS_FIELDS } from './components/operations-list/operations-list.models';
import { CMD_TEST_FIELDS } from './components/cmd-test-panel/cmd-test-panel.models';
import { DEFAULT_GRID_CONFIG } from '../../../../mocks/mock-data';

@Component({
  selector: 'app-frequent-cmds-tab',
  templateUrl: './frequent-cmds-tab.component.html',
  styleUrls: ['./frequent-cmds-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [StatusGridService],
})
export class FrequentCmdsTabComponent implements OnInit, OnDestroy {
  @Input() scenario = 'highway-cruise';
  @Input() isRealtime = false;

  readonly gridConfig: GridConfig = DEFAULT_GRID_CONFIG;
  readonly dashboardState$: Observable<DashboardState>;
  readonly gridRows$: Observable<RowViewModel[]>;

  private wsSub?: Subscription;

  constructor(
    private readonly stateService: DashboardStateService,
    private readonly wsService: WsService,
    private readonly gridService: StatusGridService,
  ) {
    this.dashboardState$ = this.stateService.state$;
    this.gridRows$ = this.gridService.gridRows$;
  }

  ngOnInit(): void {
    const allFields = [...OPERATIONS_FIELDS, ...CMD_TEST_FIELDS];
    this.gridService.configure(
      DEFAULT_GRID_CONFIG.columns,
      buildAbbrLookup(allFields),
      buildGridRowDefs(),
    );
    this.wsSub = this.wsService.message$.subscribe((update) => {
      this.gridService.applyUpdate(update);
    });
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
  }

  onDefault(): void {
    this.stateService.resetToDefaults();
  }

  onStateChanged(partial: LeftPanelPayload): void {
    this.stateService.updateState(this.buildState(partial));
  }

  onSaved(partial: LeftPanelPayload): void {
    this.stateService.saveConfig(this.buildState(partial));
  }

  onCancelled(): void {
    this.stateService.cancelChanges();
  }

  private buildState(partial: LeftPanelPayload) {
    return {
      scenario: this.scenario,
      cmd: partial.cmd,
      operations: partial.operations,
      cmdTest: partial.cmdTest,
    };
  }
}
