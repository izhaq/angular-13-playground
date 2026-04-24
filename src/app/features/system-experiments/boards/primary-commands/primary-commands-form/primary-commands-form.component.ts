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
 * Shape: a vertical list of label + dropdown rows, broken into two
 * sections — the main fields and the "Cmd to GS" sub-section. The
 * sub-section's three fields are part of the Apply payload but are
 * intentionally NOT in the grid (the shell only feeds main fields to
 * the row builder).
 *
 * Disable/enable is driven by the FormGroup itself (the shell calls
 * `formGroup.disable()` / `.enable()` when test mode flips). Keeping
 * the FormGroup as the single source of truth removes a redundant
 * `[disabled]` input and the OnChanges plumbing it required.
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
