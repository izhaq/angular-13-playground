import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { RareDashboardState, RareLeftPanelPayload } from './models/rare-dashboard.models';
import { GridConfig, RowViewModel } from '../status-grid/models/grid.models';
import { buildAbbrLookup } from '../status-grid/models/abbr-lookup';
import { buildRareGridRowDefs } from '../status-grid/models/grid-defaults';
import { RareStateService } from './services/rare-state.service';
import { WsService } from '../../services/ws.service';
import { StatusGridService } from '../status-grid/services/status-grid.service';
import { RARE_OPERATIONS_FIELDS } from './components/rare-operations-list/rare-operations-list.models';
import { RARE_DEFAULT_GRID_CONFIG } from '../../../../mocks/mock-data';

@Component({
  selector: 'app-rare-cmds-tab',
  templateUrl: './rare-cmds-tab.component.html',
  styleUrls: ['./rare-cmds-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [StatusGridService],
})
export class RareCmdsTabComponent implements OnInit, OnDestroy {
  @Input() scenario = 'highway-cruise';
  @Input() isRealtime = false;

  readonly gridConfig: GridConfig = RARE_DEFAULT_GRID_CONFIG;
  readonly dashboardState$: Observable<RareDashboardState>;
  readonly gridRows$: Observable<RowViewModel[]>;

  private wsSub?: Subscription;

  constructor(
    private readonly stateService: RareStateService,
    private readonly wsService: WsService,
    private readonly gridService: StatusGridService,
  ) {
    this.dashboardState$ = this.stateService.state$;
    this.gridRows$ = this.gridService.gridRows$;
  }

  ngOnInit(): void {
    this.gridService.configure(
      RARE_DEFAULT_GRID_CONFIG.columns,
      buildAbbrLookup(RARE_OPERATIONS_FIELDS),
      buildRareGridRowDefs(),
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

  onStateChanged(partial: RareLeftPanelPayload): void {
    this.stateService.updateState(this.buildState(partial));
  }

  onSaved(partial: RareLeftPanelPayload): void {
    this.stateService.saveConfig(this.buildState(partial));
  }

  onCancelled(): void {
    this.stateService.cancelChanges();
  }

  private buildState(partial: RareLeftPanelPayload): RareDashboardState {
    return {
      scenario: this.scenario,
      cmd: partial.cmd,
      rareOperations: partial.rareOperations,
    };
  }
}
