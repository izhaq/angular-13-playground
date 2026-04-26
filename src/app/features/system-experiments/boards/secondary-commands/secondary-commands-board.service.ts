import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BoardPostPayload } from '../../api/api-contract';
import { SystemExperimentsApiService } from '../../api/system-experiments-api.service';
import { CmdSelection } from '../../shared/models';
import { buildFormGroup } from '../build-form-group';
import {
  SECONDARY_COMMANDS_ALL_FIELDS,
  buildSecondaryCommandsDefaults,
} from './secondary-commands.fields';

/**
 * Per-board service for the Secondary Commands tab.
 *
 * Same shape as `PrimaryCommandsBoardService` — kept as a deliberate
 * sibling rather than collapsed into a shared base class. Two reasons:
 *
 *   1. The boards differ ONLY in which API endpoint Apply hits and
 *      which sibling fields module seeds the FormGroup. A base class
 *      would parameterise on a 1-line difference and add generics +
 *      an abstract method to do it. The repeated 30-line file is
 *      easier to read and easier to evolve when one board eventually
 *      grows a behaviour the other doesn't.
 *   2. Same call we made for the form components themselves (plan §6 /
 *      §13: "don't generalize until the third use case"). Two boards,
 *      two services. If a third board lands and the surface is
 *      genuinely identical, that's the moment to reach for a base.
 *
 * See `PrimaryCommandsBoardService` for the full rationale on
 * lifetime, snapshot semantics, and why `apply()` returns
 * `Observable<void>` rather than committing cross-board state itself.
 */
@Injectable()
export class SecondaryCommandsBoardService {

  readonly formGroup: FormGroup = buildFormGroup(SECONDARY_COMMANDS_ALL_FIELDS);

  private snapshot: Record<string, unknown> = this.formGroup.getRawValue();

  constructor(private readonly api: SystemExperimentsApiService) {}

  defaults(): void {
    this.formGroup.reset(buildSecondaryCommandsDefaults(), { emitEvent: false });
  }

  cancel(): void {
    this.formGroup.reset(this.snapshot, { emitEvent: false });
  }

  apply(cmd: CmdSelection): Observable<void> {
    const payload: BoardPostPayload = {
      sides: cmd.sides,
      wheels: cmd.wheels,
      fields: this.formGroup.getRawValue() as Record<string, string | string[]>,
    };
    return this.api.postSecondary(payload).pipe(
      tap(() => {
        this.snapshot = this.formGroup.getRawValue();
      }),
    );
  }

  setEnabled(enabled: boolean): void {
    this.formGroup[enabled ? 'enable' : 'disable']({ emitEvent: false });
  }
}
