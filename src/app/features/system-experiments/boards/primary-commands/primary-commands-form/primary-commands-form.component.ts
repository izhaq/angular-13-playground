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
 * Dumb renderer for the Primary form. FormGroup is supplied by the shell;
 * disable/enable propagates via `FormGroup.statusChanges`.
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
