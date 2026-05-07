import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { CMD_SIDE_OPTIONS, CMD_WHEEL_OPTIONS } from './cmd-options';
import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';
import { CmdSelection } from '../../shared/models';
import { Side, Wheel } from '../../shared/option-values';

/**
 * Sticky CMD section — two multi-select dropdowns (Side, Wheel).
 * Stateless; selection is owned by the shell so it persists across tab switches.
 */
@Component({
  selector: 'system-experiments-cmd-section',
  templateUrl: './cmd-section.component.html',
  styleUrls: ['./cmd-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmdSectionComponent {
  @Input() selection: CmdSelection = { sides: [], wheels: [] };
  @Input() disabled = false;

  @Output() readonly selectionChange = new EventEmitter<CmdSelection>();

  readonly sideOptions = CMD_SIDE_OPTIONS;
  readonly wheelOptions = CMD_WHEEL_OPTIONS;

  readonly labels = {
    cmd: L.cmd,
  };

  onSidesChange(values: string[]): void {
    this.selectionChange.emit({
      ...this.selection,
      sides: values as Side[],
    });
  }

  onWheelsChange(values: string[]): void {
    this.selectionChange.emit({
      ...this.selection,
      wheels: values as Wheel[],
    });
  }
}
