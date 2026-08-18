import { Injectable } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { BoardPostPayload } from '../../api/api-contract';
import { SystemExperimentsApiService } from '../../api/system-experiments-api.service';
import { CmdSelection } from '../../shared/models';
import { buildFormGroup } from '../build-form-group';
import { RuleViolation, runRules } from '../validation';
import {
  SECONDARY_COMMANDS_ALL_FIELDS,
  buildSecondaryCommandsDefaults,
} from './secondary-commands.fields';
import { SECONDARY_COMMANDS_RULES } from './secondary-commands.rules';

/** Mirror of `PrimaryCommandsBoardService` — same shape, different fields/endpoint. */
@Injectable()
export class SecondaryCommandsBoardService {

  readonly formGroup: UntypedFormGroup = buildFormGroup(SECONDARY_COMMANDS_ALL_FIELDS);

  private snapshot: Record<string, unknown> = this.formGroup.getRawValue();

  constructor(private readonly api: SystemExperimentsApiService) {}

  defaults(): void {
    const seed = buildSecondaryCommandsDefaults();
    this.formGroup.reset(seed, { emitEvent: false });
    this.snapshot = this.formGroup.getRawValue();
  }

  /** See `PrimaryCommandsBoardService.seed` — same contract. */
  seed(values: Record<string, string | string[]>): void {
    this.formGroup.reset(values, { emitEvent: false });
    this.snapshot = this.formGroup.getRawValue();
  }

  cancel(): void {
    this.formGroup.reset(this.snapshot, { emitEvent: false });
  }

  /** See `PrimaryCommandsBoardService.validate` — same contract. Secondary
   * declares no rules today, so this returns `[]`, but the generic path stays
   * identical so adding a rule later is config-only. */
  validate(cmd: CmdSelection): RuleViolation[] {
    return runRules(SECONDARY_COMMANDS_RULES, { values: this.formGroup.getRawValue(), cmd });
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
