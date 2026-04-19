import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { CmdSelection, RareDashboardState, RareLeftPanelPayload } from './models/rare-dashboard.models';
import { RARE_DEFAULT_STATE } from './models/rare-dashboard-defaults';
import { DEFAULT_CMD_SELECTION } from '../cmd-panel/cmd-panel.models';
import { GridConfig, RowViewModel } from '../status-grid/models/grid.models';
import { buildRareGridRowDefs } from '../status-grid/models/grid-defaults';
import { TAB_STATE_CONFIG } from '../../services/tab-state.config';
import { TabStateService } from '../../services/tab-state.service';
import { WsService } from '../../services/ws.service';
import { StatusGridService } from '../status-grid/services/status-grid.service';
import { RARE_GRID_CONFIG } from './models/rare-grid-config';

@Component({
  selector: 'app-rare-cmds-tab',
  templateUrl: './rare-cmds-tab.component.html',
  styleUrls: ['./rare-cmds-tab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    StatusGridService,
    { provide: TAB_STATE_CONFIG, useValue: { defaultState: RARE_DEFAULT_STATE, apiUrl: '/api/rare-config' } },
    TabStateService,
  ],
})
export class RareCmdsTabComponent implements OnInit, OnDestroy {
  @Input() isRealtime = false;
  // CMD selection is owned by the wrapper (single shared instance across tabs)
  // and pushed down so the save payload can include it without duplicating UI.
  @Input() cmd: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  @Input() saveBlocked = false;

  // Emitted after the wrapper-owned CMD baseline should be updated. The wrapper
  // syncs its own cmd subject / baseline so behavior matches the original
  // per-tab Default/Cancel/Save semantics now that CMD is shared.
  @Output() readonly saved = new EventEmitter<CmdSelection>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly defaultClicked = new EventEmitter<void>();

  readonly gridConfig: GridConfig = RARE_GRID_CONFIG;
  readonly dashboardState$: Observable<RareDashboardState>;
  readonly gridRows$: Observable<RowViewModel[]>;

  private wsSub?: Subscription;

  constructor(
    private readonly stateService: TabStateService<RareDashboardState>,
    private readonly wsService: WsService,
    private readonly gridService: StatusGridService,
  ) {
    this.dashboardState$ = this.stateService.state$;
    this.gridRows$ = this.gridService.gridRows$;
  }

  ngOnInit(): void {
    this.gridService.configure(
      RARE_GRID_CONFIG.columns,
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
    this.defaultClicked.emit();
  }

  onStateChanged(partial: RareLeftPanelPayload): void {
    this.stateService.updateState(this.buildFullState(partial));
  }

  onSaved(partial: RareLeftPanelPayload): void {
    this.stateService.saveConfig(this.buildFullState(partial));
    this.saved.emit(this.cmd);
  }

  onCancelled(): void {
    this.stateService.cancelChanges();
    this.cancelled.emit();
  }

  private buildFullState(partial: RareLeftPanelPayload): RareDashboardState {
    return {
      isRealtime: this.isRealtime,
      cmd: this.cmd,
      rareOperations: partial.rareOperations,
    };
  }
}
