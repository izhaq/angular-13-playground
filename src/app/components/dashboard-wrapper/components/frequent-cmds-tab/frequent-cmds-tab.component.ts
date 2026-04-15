import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { DashboardState, LeftPanelPayload } from './models/dashboard.models';
import { GridConfig, RowViewModel } from '../status-grid/models/grid.models';
import { buildGridRowDefs } from '../status-grid/models/grid-defaults';
import { DashboardStateService } from './services/dashboard-state.service';
import { WsService } from '../../services/ws.service';
import { StatusGridService } from '../status-grid/services/status-grid.service';
import { FREQUENT_GRID_CONFIG } from './models/frequent-grid-config';

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

  readonly gridConfig: GridConfig = FREQUENT_GRID_CONFIG;
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
    this.gridService.configure(
      FREQUENT_GRID_CONFIG.columns,
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
