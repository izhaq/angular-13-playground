import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import { BoardPostPayload } from '../../api/api-contract';
import { EngineSimApiService } from '../../api/engine-sim-api.service';
import { EngineSimDataService } from '../../api/engine-sim-data.service';
import { buildRows, normalizeResponse } from '../../api/grid-normalizer';
import { buildFormGroup } from '../../boards/build-form-group';
import {
  PRIMARY_COMMANDS_ALL_FIELDS,
  PRIMARY_COMMANDS_MAIN_FIELDS,
  buildPrimaryCommandsDefaults,
} from '../../boards/primary-commands/primary-commands.fields';
import { PRIMARY_COMMANDS_COLUMNS } from '../../boards/primary-commands/primary-commands.columns';
import {
  SECONDARY_COMMANDS_ALL_FIELDS,
  buildSecondaryCommandsDefaults,
} from '../../boards/secondary-commands/secondary-commands.fields';
import { SECONDARY_COMMANDS_COLUMNS } from '../../boards/secondary-commands/secondary-commands.columns';
import { BOARD_IDS } from '../../shared/ids';
import { ENGINE_SIM_LABELS } from '../../shared/labels';
import { CmdSelection, GridColumn, GridRow } from '../../shared/models';

/**
 * Smart orchestrator for the Engine Sim dashboard.
 *
 * Owns:
 *   - both `FormGroup`s (created here, passed down to dumb forms)
 *   - last-applied snapshots (Cancel restores to snapshot, not to defaults)
 *   - CMD draft + saved selection (shared across both tabs)
 *   - test/live mode (drives `disable()` on both forms + CMD)
 *   - the grid row streams (one shared upstream → two per-board projections,
 *     consumed by the template via `async` pipe — no manual subscribe).
 *
 * Three behaviours derived from spec / plan §5:
 *   - Apply  → POST `{ sides, wheels, fields }`; on success snapshot form
 *              + commit cmdDraft to cmdSaved.
 *   - Cancel → `formGroup.reset(snapshot)`. CMD is shared, so Cancel does
 *              NOT touch it (use a fresh selection on either tab to revert).
 *   - Defaults → reset to `buildXxxCommandsDefaults()` (independent of snapshot).
 *
 * Tab switching (per spec): unapplied per-tab form edits are lost; CMD
 * draft persists across tabs.
 */
@Component({
  selector: 'engine-sim-shell',
  templateUrl: './engine-sim-shell.component.html',
  styleUrls: ['./engine-sim-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EngineSimShellComponent implements OnDestroy {

  readonly boardIds = BOARD_IDS;
  readonly labels = ENGINE_SIM_LABELS;

  readonly primaryFormGroup: FormGroup = buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS);
  readonly secondaryFormGroup: FormGroup = buildFormGroup(SECONDARY_COMMANDS_ALL_FIELDS);

  readonly primaryColumns: GridColumn[] = PRIMARY_COMMANDS_COLUMNS;
  readonly secondaryColumns: GridColumn[] = SECONDARY_COMMANDS_COLUMNS;

  testMode = true;

  cmdDraft: CmdSelection = { sides: [], wheels: [] };
  cmdSaved: CmdSelection = { sides: [], wheels: [] };

  /** Mirrors `!testMode` — exposed as a property so the template binds a
   * stable value without recomputing on every change-detection cycle. */
  cmdDisabled = false;

  selectedTabIndex = 0;

  /**
   * Grid rows per board. Both streams branch off ONE shared upstream
   * (`shareReplay({ bufferSize: 1, refCount: true })`) so we don't open
   * two WebSocket connections — one frame fans out to both per-board
   * `buildRows` projections. Templates consume via `| async` so OnPush
   * marks happen automatically; no manual subscribe + markForCheck.
   */
  readonly primaryRows$: Observable<GridRow[]>;
  readonly secondaryRows$: Observable<GridRow[]>;

  private primarySnapshot: Record<string, unknown> = this.primaryFormGroup.getRawValue();
  private secondarySnapshot: Record<string, unknown> = this.secondaryFormGroup.getRawValue();

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly api: EngineSimApiService,
    private readonly data: EngineSimDataService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const grid$ = this.data.connect().pipe(
      map((response) => normalizeResponse(response)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.primaryRows$ = grid$.pipe(
      // Primary's grid uses MAIN fields only — Cmd-to-GS is form-only.
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

  // ---------------------------------------------------------------------------
  // CMD section
  // ---------------------------------------------------------------------------

  onCmdSelectionChange(selection: CmdSelection): void {
    this.cmdDraft = selection;
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  onTabChange(newIndex: number): void {
    // Per spec: unapplied per-tab form edits are lost on tab switch.
    // CMD draft is shared across tabs and is intentionally NOT touched here.
    this.resetActiveFormToSnapshot();
    this.selectedTabIndex = newIndex;
  }

  // ---------------------------------------------------------------------------
  // Test / Live mode toggle
  // ---------------------------------------------------------------------------

  onTestModeChange(testMode: boolean): void {
    this.testMode = testMode;
    this.cmdDisabled = !testMode;

    const op = testMode ? 'enable' : 'disable';
    // emitEvent: false — silences valueChanges so reactive subscribers (none
    // today, but cheap insurance) don't see a phantom edit cycle from the
    // toggle itself.
    this.primaryFormGroup[op]({ emitEvent: false });
    this.secondaryFormGroup[op]({ emitEvent: false });
  }

  // ---------------------------------------------------------------------------
  // Footer actions — Primary
  // ---------------------------------------------------------------------------

  onPrimaryDefaults(): void {
    this.primaryFormGroup.reset(buildPrimaryCommandsDefaults(), { emitEvent: false });
  }

  onPrimaryCancel(): void {
    this.primaryFormGroup.reset(this.primarySnapshot, { emitEvent: false });
  }

  onPrimaryApply(): void {
    const payload = this.buildPayload(this.primaryFormGroup);
    this.api.postPrimary(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.commitPrimary());
  }

  // ---------------------------------------------------------------------------
  // Footer actions — Secondary
  // ---------------------------------------------------------------------------

  onSecondaryDefaults(): void {
    this.secondaryFormGroup.reset(buildSecondaryCommandsDefaults(), { emitEvent: false });
  }

  onSecondaryCancel(): void {
    this.secondaryFormGroup.reset(this.secondarySnapshot, { emitEvent: false });
  }

  onSecondaryApply(): void {
    const payload = this.buildPayload(this.secondaryFormGroup);
    this.api.postSecondary(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.commitSecondary());
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private buildPayload(formGroup: FormGroup): BoardPostPayload {
    return {
      sides: this.cmdDraft.sides,
      wheels: this.cmdDraft.wheels,
      fields: formGroup.getRawValue() as Record<string, string | string[]>,
    };
  }

  private commitPrimary(): void {
    this.primarySnapshot = this.primaryFormGroup.getRawValue();
    this.cmdSaved = this.cmdDraft;
    this.cdr.markForCheck();
  }

  private commitSecondary(): void {
    this.secondarySnapshot = this.secondaryFormGroup.getRawValue();
    this.cmdSaved = this.cmdDraft;
    this.cdr.markForCheck();
  }

  private resetActiveFormToSnapshot(): void {
    if (this.selectedTabIndex === 0) {
      this.primaryFormGroup.reset(this.primarySnapshot, { emitEvent: false });
    } else {
      this.secondaryFormGroup.reset(this.secondarySnapshot, { emitEvent: false });
    }
  }
}
