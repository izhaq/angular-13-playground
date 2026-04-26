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
import { PRIMARY_COMMANDS_MAIN_FIELDS } from '../boards/primary-commands/primary-commands.fields';
import { PRIMARY_COMMANDS_COLUMNS } from '../boards/primary-commands/primary-commands.columns';
import { SecondaryCommandsBoardService } from '../boards/secondary-commands/secondary-commands-board.service';
import { SECONDARY_COMMANDS_ALL_FIELDS } from '../boards/secondary-commands/secondary-commands.fields';
import { SECONDARY_COMMANDS_COLUMNS } from '../boards/secondary-commands/secondary-commands.columns';
import { BOARD_IDS } from '../shared/ids';
import { SYSTEM_EXPERIMENTS_LABELS } from '../shared/labels';
import { CmdSelection, GridColumn, GridRow } from '../shared/models';

/**
 * Smart orchestrator for the System Experiments dashboard — Phase 8 shape.
 *
 * Owns chrome + cross-board state only:
 *   - test/live mode (drives `setEnabled` on both per-board services + CMD)
 *   - CMD draft + saved selection (shared across both tabs)
 *   - selectedTabIndex (UI affordance for "which board am I on")
 *   - the grid row streams (one shared upstream → two per-board projections,
 *     consumed by the template via `async` pipe — no manual subscribe)
 *   - the SHARED `BoardFooterComponent` (one instance, mounted outside
 *     the tab-group), with `onActive*` dispatch routing the three events
 *     to the active board's service
 *
 * Per-board state (FormGroup, snapshot, defaults / cancel / apply,
 * payload composition) lives behind `PrimaryCommandsBoardService` /
 * `SecondaryCommandsBoardService`. They're component-scoped via the
 * `providers: []` on this component, so their lifetime matches the
 * shell's — same observable behaviour as the per-board fields had
 * before Phase 8, just relocated. See each service's header for the
 * rationale (no shared base class, snapshot-after-success on
 * `apply()`, etc.).
 *
 * Three behaviours derived from spec / plan §5 — now expressed at the
 * shell as one-liners that delegate to the active board's service:
 *   - Apply  → `activeBoard.apply(cmdDraft)`; on success, the shell
 *              commits its OWN cross-board piece (`cmdSaved = cmdDraft`).
 *              The service commits its own snapshot inside `apply()`.
 *   - Cancel → `activeBoard.cancel()`. CMD is shared, so Cancel does
 *              NOT touch it.
 *   - Defaults → `activeBoard.defaults()` (independent of snapshot).
 *
 * Tab switching (per spec): unapplied per-tab form edits are lost;
 * CMD draft persists across tabs. Implemented as `activeBoard.cancel()`
 * before the index updates — same as before.
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
   *
   * Lives at shell scope (not in the per-board services) because the
   * upstream is shared — moving it into a service would either
   * duplicate the subscription or force the service to depend on the
   * shell's stream. Cleaner to keep the read-side at shell scope and
   * let services stay focused on the write-side (Apply / state).
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

  /**
   * Apply requires BOTH a side and a wheel — the POST payload routes by
   * `(side, wheel)` for additionalFields and by `side` for aCommands, so
   * an empty selection would no-op on the server. Defaults + Cancel stay
   * enabled regardless: those are local form ops with no network side
   * effect and are useful even before the user picks a CMD scope.
   *
   * Read as a getter (cheap, no caching needed) so the template re-evaluates
   * exactly when CMD selection changes — `cmdDraft` is reassigned in
   * `onCmdSelectionChange`, which triggers OnPush change detection.
   */
  get applyDisabled(): boolean {
    return this.cmdDraft.sides.length === 0 || this.cmdDraft.wheels.length === 0;
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  onTabChange(newIndex: number): void {
    // Per spec: unapplied per-tab form edits are lost on tab switch.
    // CMD draft is shared across tabs and is intentionally NOT touched here.
    this.activeBoard.cancel();
    this.selectedTabIndex = newIndex;
  }

  // ---------------------------------------------------------------------------
  // Test / Live mode toggle
  // ---------------------------------------------------------------------------

  onTestModeChange(testMode: boolean): void {
    this.testMode = testMode;
    this.cmdDisabled = !testMode;
    // Fan-out to both per-board services — test-mode is a global UI
    // state. `setEnabled` wraps `enable() / disable()` with
    // `emitEvent: false` so reactive subscribers don't see a phantom
    // edit cycle.
    this.primary.setEnabled(testMode);
    this.secondary.setEnabled(testMode);
  }

  // ---------------------------------------------------------------------------
  // Footer dispatch — single shared footer routes to the active board.
  // Each handler is one line because all per-board logic lives behind
  // the service; the shell only knows "which one is active" and "what
  // to do with cross-board state on apply success".
  // ---------------------------------------------------------------------------

  onActiveDefaults(): void {
    this.activeBoard.defaults();
  }

  onActiveCancel(): void {
    this.activeBoard.cancel();
  }

  onActiveApply(): void {
    // Service commits its own snapshot inside `apply()`. The shell
    // commits its own cross-board piece — `cmdSaved` — only on success.
    // `takeUntil(destroy$)` cleans up if the shell is destroyed mid-flight.
    //
    // The error branch is an explicit no-op rather than missing — without
    // an error handler RxJS rethrows into the global scope, which (on
    // a real backend hiccup) would crash the page. Wire UI feedback
    // here in the host app (snackbar / toast) — the shell stays
    // chrome-agnostic and doesn't depend on a notification service.
    this.activeBoard.apply(this.cmdDraft)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cmdSaved = this.cmdDraft;
        },
        error: () => {
          /* swallowed — see comment above */
        },
      });
  }

  /**
   * The currently-active board's service. Typed as the service union
   * so the call sites stay terse but type-safe — both services expose
   * the identical shape, by design (see each service's header for why
   * we keep them as siblings rather than a base class).
   */
  private get activeBoard(): PrimaryCommandsBoardService | SecondaryCommandsBoardService {
    return this.selectedTabIndex === 0 ? this.primary : this.secondary;
  }
}
