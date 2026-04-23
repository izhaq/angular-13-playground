import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { BOARD_IDS } from '../../../shared/board-ids';
import { FieldConfig } from '../../../shared/engine-sim.models';
import { SECONDARY_COMMANDS_ALL_FIELDS } from '../secondary-commands.fields';

/**
 * Dumb form component for the Secondary Commands board.
 *
 * Flat list of label + dropdown rows — no sub-sections (every field is
 * part of both the Apply payload and the grid). Disable/enable is
 * driven by the FormGroup itself (the shell calls `formGroup.disable()`
 * / `.enable()` when test mode flips), keeping a single source of
 * truth and matching the Primary board's contract.
 */
@Component({
  selector: 'engine-sim-secondary-commands-form',
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
