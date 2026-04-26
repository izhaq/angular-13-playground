import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BoardPostPayload } from '../../api/api-contract';
import { SystemExperimentsApiService } from '../../api/system-experiments-api.service';
import { CmdSelection } from '../../shared/models';
import { buildFormGroup } from '../build-form-group';
import {
  PRIMARY_COMMANDS_ALL_FIELDS,
  buildPrimaryCommandsDefaults,
} from './primary-commands.fields';

/**
 * Per-board service for the Primary Commands tab — owns the board's
 * FormGroup, last-applied snapshot, and the three action verbs
 * (`defaults / cancel / apply`) plus a test/live-mode `setEnabled` switch.
 *
 * **Why a service rather than fields-on-shell.** Before Phase 8 the shell
 * held two of everything (two FormGroups, two snapshots, two
 * `commitX()` methods, six `onPrimary…` / `onSecondary…` handlers, two
 * `BoardPostPayload` builds). The duplication was symmetric — both
 * boards have the same Apply / Cancel / Defaults shape — but each
 * board's *state* is independent (Primary's last-applied snapshot is
 * unrelated to Secondary's). Moving the per-board cluster behind a
 * service per board keeps the symmetry visible (two service classes,
 * identical surface) while removing the scattered fields and helpers
 * from the shell. The shell collapses into pure orchestration: tabs,
 * shared CMD state, footer dispatch, and cross-board fan-out
 * (test-mode disable/enable).
 *
 * **FormGroup shape lives in the sibling fields module.** This service
 * materialises `formGroup` via `buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS)`
 * directly — service and `primary-commands.fields.ts` are sibling
 * files in the same board folder, so the coupling is local and
 * intentional. (See the form component header for why the form itself
 * stays a pure renderer and doesn't expose a shape factory — Phase 8
 * §15.)
 *
 * **Lifetime.** Component-scoped via `providers: []` on the shell, so a
 * new service is created each time the shell mounts and disposed
 * with it. Same lifetime as the per-board fields had before — no
 * change in observable semantics.
 *
 * **Why `apply()` returns `Observable<void>` rather than committing
 * everything internally.** On Apply success the shell also has to
 * commit `cmdSaved` (the LAST-applied CMD scope, shared across both
 * tabs). That's cross-board state and stays at shell scope. If
 * `apply()` swallowed the observable, the shell would lose the success
 * hook and we'd need a separate event/output to carry "applied" back
 * up — strictly worse. Keeping the observable hot lets the shell chain
 * `.subscribe(() => this.cmdSaved = this.cmdDraft)` and gives the
 * caller full control over teardown (`takeUntil(destroy$)`).
 *
 * The snapshot commit lives INSIDE `apply()`'s pipe (`tap` before the
 * subject reaches the caller), so the per-board side effect is
 * service-local while the cross-board side effect stays at the shell.
 */
@Injectable()
export class PrimaryCommandsBoardService {

  /**
   * The board's reactive form. Bound by the shell's template via
   * `<system-experiments-primary-commands-form [formGroup]="primary.formGroup">`.
   *
   * Lifetime is the service's lifetime, which is the shell's lifetime.
   * Eager-create is necessary: Material lazy-renders the inactive
   * tab's form component, but the FormGroup must be reachable for
   * snapshot/Apply regardless of which tab is currently visible. The
   * fields module owns the *shape*; we hold the *instance* and the
   * actions that operate on it.
   */
  readonly formGroup: FormGroup = buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS);

  /**
   * Last-applied form values. Cancel restores to this (NOT to defaults)
   * — Defaults is its own action. Initialized to the defaults-seeded
   * raw value so Cancel-before-first-Apply behaves predictably without
   * needing a nullable/undefined branch.
   */
  private snapshot: Record<string, unknown> = this.formGroup.getRawValue();

  constructor(private readonly api: SystemExperimentsApiService) {}

  /** Reset the form to canonical defaults. Independent of snapshot. */
  defaults(): void {
    this.formGroup.reset(buildPrimaryCommandsDefaults(), { emitEvent: false });
  }

  /** Reset the form to the last-applied snapshot (no network call). */
  cancel(): void {
    this.formGroup.reset(this.snapshot, { emitEvent: false });
  }

  /**
   * POST the current form value plus the supplied CMD selection. On
   * success, the snapshot is updated to the just-sent values BEFORE
   * the returned observable emits — so any caller chaining off success
   * sees a board that has already committed.
   */
  apply(cmd: CmdSelection): Observable<void> {
    const payload: BoardPostPayload = {
      sides: cmd.sides,
      wheels: cmd.wheels,
      fields: this.formGroup.getRawValue() as Record<string, string | string[]>,
    };
    return this.api.postPrimary(payload).pipe(
      tap(() => {
        this.snapshot = this.formGroup.getRawValue();
      }),
    );
  }

  /**
   * Flip enable/disable on the FormGroup. Wraps the call so the shell
   * doesn't have to know to pass `{ emitEvent: false }` (toggling
   * test/live mode is a UI concern, not a value change — silencing
   * `valueChanges` keeps reactive subscribers from seeing a phantom
   * edit cycle).
   */
  setEnabled(enabled: boolean): void {
    this.formGroup[enabled ? 'enable' : 'disable']({ emitEvent: false });
  }
}
