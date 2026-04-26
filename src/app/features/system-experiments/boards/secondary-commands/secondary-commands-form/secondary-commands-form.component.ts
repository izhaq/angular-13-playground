import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { BOARD_IDS } from '../../../shared/ids';
import { FieldConfig } from '../../../shared/models';
import { SECONDARY_COMMANDS_ALL_FIELDS } from '../secondary-commands.fields';

/** Dumb renderer for the Secondary form — see `PrimaryCommandsFormComponent` for the contract. */
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
