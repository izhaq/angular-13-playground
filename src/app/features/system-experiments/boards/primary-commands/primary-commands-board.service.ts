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
 * Per-board state for the Primary tab — owns the FormGroup, last-applied
 * snapshot, and the action verbs (defaults / cancel / apply / setEnabled).
 * Component-scoped via the shell's `providers: []`.
 */
@Injectable()
export class PrimaryCommandsBoardService {

  readonly formGroup: FormGroup = buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS);

  private snapshot: Record<string, unknown> = this.formGroup.getRawValue();

  constructor(private readonly api: SystemExperimentsApiService) {}

  defaults(): void {
    this.formGroup.reset(buildPrimaryCommandsDefaults(), { emitEvent: false });
  }

  cancel(): void {
    this.formGroup.reset(this.snapshot, { emitEvent: false });
  }

  /** Snapshot commits AFTER the API succeeds — failed Apply leaves snapshot intact. */
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

  /** `emitEvent: false` so reactive subscribers don't see a phantom edit cycle. */
  setEnabled(enabled: boolean): void {
    this.formGroup[enabled ? 'enable' : 'disable']({ emitEvent: false });
  }
}
