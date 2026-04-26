import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { BOARD_IDS } from '../../../shared/ids';
import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../../shared/labels';
import { FieldConfig } from '../../../shared/models';
import {
  PRIMARY_COMMANDS_CMD_TO_GS_FIELDS,
  PRIMARY_COMMANDS_MAIN_FIELDS,
} from '../primary-commands.fields';

/**
 * Dumb form component for the Primary Commands board.
 *
 * Vertical list of label + dropdown rows, broken into two sections —
 * the main fields and the "Cmd to GS" sub-section. The sub-section's
 * three fields are part of the Apply payload but intentionally NOT in
 * the grid (the per-board service only feeds main fields to the row
 * builder).
 *
 * Disable/enable is driven by the FormGroup itself — the per-board
 * service calls `formGroup.disable()` / `.enable()` (via its
 * `setEnabled` wrapper) when test mode flips, and Angular's
 * `FormGroup.statusChanges` propagates the disabled state down to
 * every control. The component does nothing but render: it takes a
 * FormGroup as an input and projects each declared `FieldConfig` into
 * a dropdown bound by `formControlName`. FormGroup *shape* (which
 * controls + which defaults) lives in the sibling fields module
 * (`primary-commands.fields.ts`); the per-board service composes them
 * via the shared `buildFormGroup` primitive. See plan §15 for why the
 * form stays a pure renderer rather than exposing a shape factory.
 */
@Component({
  selector: 'system-experiments-primary-commands-form',
  templateUrl: './primary-commands-form.component.html',
  styleUrls: ['./primary-commands-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrimaryCommandsFormComponent {

  @Input() formGroup!: FormGroup;

  readonly boardId = BOARD_IDS.primary;
  readonly mainFields: FieldConfig[] = PRIMARY_COMMANDS_MAIN_FIELDS;
  readonly cmdToGsFields: FieldConfig[] = PRIMARY_COMMANDS_CMD_TO_GS_FIELDS;
  readonly labels = { cmdToGs: L.cmdToGs };

  readonly trackByKey = (_: number, field: FieldConfig): string => field.key;
}
