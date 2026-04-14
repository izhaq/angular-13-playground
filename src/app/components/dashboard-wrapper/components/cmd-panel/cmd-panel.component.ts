import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  CmdSelection,
  DEFAULT_CMD_SELECTION,
  SIDE_OPTIONS,
  WHEEL_OPTIONS,
} from './cmd-panel.models';

@Component({
  selector: 'app-cmd-panel',
  templateUrl: './cmd-panel.component.html',
  styleUrls: ['./cmd-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmdPanelComponent {
  readonly sideOptions = SIDE_OPTIONS;
  readonly wheelOptions = WHEEL_OPTIONS;

  @Input() value: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  @Input() disabled = false;

  @Output() changed = new EventEmitter<CmdSelection>();

  onSidesChanged(sides: string[]): void {
    this.value = { ...this.value, sides };
    this.changed.emit(this.value);
  }

  onWheelsChanged(wheels: string[]): void {
    this.value = { ...this.value, wheels };
    this.changed.emit(this.value);
  }
}
