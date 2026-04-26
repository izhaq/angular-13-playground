import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import { SystemExperimentsDataService } from '../api/system-experiments-data.service';
import { buildRows, normalizeResponse } from '../api/grid-normalizer';
import { PrimaryCommandsBoardService } from '../boards/primary-commands/primary-commands-board.service';
import {
  PRIMARY_COMMANDS_CMD_TO_GS_FIELDS,
  PRIMARY_COMMANDS_MAIN_FIELDS,
} from '../boards/primary-commands/primary-commands.fields';
import { PRIMARY_COMMANDS_COLUMNS } from '../boards/primary-commands/primary-commands.columns';
import { SecondaryCommandsBoardService } from '../boards/secondary-commands/secondary-commands-board.service';
import { SECONDARY_COMMANDS_ALL_FIELDS } from '../boards/secondary-commands/secondary-commands.fields';
import { SECONDARY_COMMANDS_COLUMNS } from '../boards/secondary-commands/secondary-commands.columns';
import { DropdownOption } from '../_external/ui-primitives';
import { BOARD_IDS } from '../shared/ids';
import { SYSTEM_EXPERIMENTS_LABELS } from '../shared/labels';
import { CmdSelection, FieldConfig, GridColumn, GridRow } from '../shared/models';

const TEST_MODE_VALUE_ACTIVE = 'active';
const TEST_MODE_VALUE_INACTIVE = 'inactive';

/**
 * Smart shell — owns chrome, CMD, tab state, and grid streams. Per-board
 * logic lives behind the `*BoardService` providers below.
 */
@Component({
  selector: 'system-experiments-shell',
  templateUrl: './system-experiments-shell.component.html',
  styleUrls: ['./system-experiments-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    PrimaryCommandsBoardService,
    SecondaryCommandsBoardService,
  ],
})
export class SystemExperimentsShellComponent implements OnDestroy {

  readonly boardIds = BOARD_IDS;
  readonly labels = SYSTEM_EXPERIMENTS_LABELS;

  readonly primaryColumns: GridColumn[] = PRIMARY_COMMANDS_COLUMNS;
  readonly secondaryColumns: GridColumn[] = SECONDARY_COMMANDS_COLUMNS;

  // Field lists handed to <system-experiments-board-rows>. `gridFields`
  // appear in the data area; `formOnlyFields` get a label + control but
  // no grid cells (Primary's "Cmd to GS" subset; Secondary has none).
  readonly primaryGridFields: FieldConfig[]     = PRIMARY_COMMANDS_MAIN_FIELDS;
  readonly primaryFormOnlyFields: FieldConfig[] = PRIMARY_COMMANDS_CMD_TO_GS_FIELDS;
  readonly secondaryGridFields: FieldConfig[]     = SECONDARY_COMMANDS_ALL_FIELDS;
  readonly secondaryFormOnlyFields: FieldConfig[] = [];

  readonly testModeOptions: DropdownOption[] = [
    { value: TEST_MODE_VALUE_ACTIVE,   label: SYSTEM_EXPERIMENTS_LABELS.testModeActive },
    { value: TEST_MODE_VALUE_INACTIVE, label: SYSTEM_EXPERIMENTS_LABELS.testModeNotActive },
  ];

  testMode = true;

  cmdDraft: CmdSelection = { sides: [], wheels: [] };
  cmdSaved: CmdSelection = { sides: [], wheels: [] };

  cmdDisabled = false;

  selectedTabIndex = 0;

  /**
   * Shared upstream → two per-board projections; consumed via `async`
   * pipe so OnPush works without manual subscribe.
   */
  readonly primaryRows$: Observable<GridRow[]>;
  readonly secondaryRows$: Observable<GridRow[]>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    readonly primary: PrimaryCommandsBoardService,
    readonly secondary: SecondaryCommandsBoardService,
    data: SystemExperimentsDataService,
  ) {
    const grid$ = data.connect().pipe(
      map((response) => normalizeResponse(response)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.primaryRows$ = grid$.pipe(
      map((grid) => buildRows(PRIMARY_COMMANDS_MAIN_FIELDS, grid, PRIMARY_COMMANDS_COLUMNS)),
    );
    this.secondaryRows$ = grid$.pipe(
      map((grid) => buildRows(SECONDARY_COMMANDS_ALL_FIELDS, grid, SECONDARY_COMMANDS_COLUMNS)),
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // CMD

  onCmdSelectionChange(selection: CmdSelection): void {
    this.cmdDraft = selection;
  }

  /** Apply needs both side and wheel — empty selection no-ops on the server. */
  get applyDisabled(): boolean {
    return this.cmdDraft.sides.length === 0 || this.cmdDraft.wheels.length === 0;
  }

  // Tabs

  onTabChange(newIndex: number): void {
    // Per spec: unapplied per-tab form edits are lost on tab switch; CMD persists.
    this.activeBoard.cancel();
    this.selectedTabIndex = newIndex;
  }

  // Test / Live mode dropdown

  get testModeValue(): string {
    return this.testMode ? TEST_MODE_VALUE_ACTIVE : TEST_MODE_VALUE_INACTIVE;
  }

  onTestModeChange(value: string): void {
    // Fail-closed: anything other than the explicit "active" sentinel disables.
    const enabled = value === TEST_MODE_VALUE_ACTIVE;
    this.testMode = enabled;
    this.cmdDisabled = !enabled;
    this.primary.setEnabled(enabled);
    this.secondary.setEnabled(enabled);
  }

  // Footer dispatch — single shared footer routes to the active board.

  onActiveDefaults(): void {
    this.activeBoard.defaults();
  }

  onActiveCancel(): void {
    this.activeBoard.cancel();
  }

  onActiveApply(): void {
    // Error branch is an explicit no-op: without it RxJS rethrows into the
    // global scope on a backend hiccup. Wire UI feedback (snackbar/toast)
    // in the host app so the shell stays chrome-agnostic.
    this.activeBoard.apply(this.cmdDraft)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cmdSaved = this.cmdDraft;
        },
        error: () => { /* no-op */ },
      });
  }

  private get activeBoard(): PrimaryCommandsBoardService | SecondaryCommandsBoardService {
    return this.selectedTabIndex === 0 ? this.primary : this.secondary;
  }
}
