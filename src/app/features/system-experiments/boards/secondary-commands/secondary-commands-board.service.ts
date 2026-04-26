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

/** Mirror of `PrimaryCommandsBoardService` — same shape, different fields/endpoint. */
@Injectable()
export class SecondaryCommandsBoardService {

  readonly formGroup: FormGroup = buildFormGroup(SECONDARY_COMMANDS_ALL_FIELDS);

  private snapshot: Record<string, unknown> = this.formGroup.getRawValue();

  constructor(private readonly api: SystemExperimentsApiService) {}

  defaults(): void {
    const seed = buildSecondaryCommandsDefaults();
    this.formGroup.reset(seed, { emitEvent: false });
    this.snapshot = this.formGroup.getRawValue();
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
