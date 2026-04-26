import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { BOARD_IDS } from '../../../shared/ids';
import { FieldConfig } from '../../../shared/models';
import { SECONDARY_COMMANDS_ALL_FIELDS } from '../secondary-commands.fields';

/**
 * Dumb form component for the Secondary Commands board.
 *
 * Flat list of label + dropdown rows — no sub-sections (every field is
 * part of both the Apply payload and the grid). Disable/enable is
 * driven by the FormGroup itself (the per-board service calls
 * `formGroup.disable()` / `.enable()` via its `setEnabled` wrapper
 * when test mode flips), keeping a single source of truth and matching
 * the Primary board's contract.
 *
 * FormGroup shape (controls + defaults) lives in the sibling fields
 * module (`secondary-commands.fields.ts`); the per-board service
 * composes them via the shared `buildFormGroup` primitive. See
 * `PrimaryCommandsFormComponent` for the full rationale (plan §15).
 */
@Component({
  selector: 'system-experiments-secondary-commands-form',
  templateUrl: './secondary-commands-form.component.html',
  styleUrls: ['./secondary-commands-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecondaryCommandsFormComponent {

  @Input() formGroup!: FormGroup;

  readonly boardId = BOARD_IDS.secondary;
  readonly fields: FieldConfig[] = SECONDARY_COMMANDS_ALL_FIELDS;

  readonly trackByKey = (_: number, field: FieldConfig): string => field.key;
}
