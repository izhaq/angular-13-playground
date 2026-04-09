import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  DEFAULT_DRIVE_COMMAND,
  DRIVE_MODE_OPTIONS,
  DriveCommand,
  TRANSMISSION_OPTIONS,
} from './cmd-panel.models';

@Component({
  selector: 'app-cmd-panel',
  templateUrl: './cmd-panel.component.html',
  styleUrls: ['./cmd-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmdPanelComponent {
  readonly transmissionOptions = TRANSMISSION_OPTIONS;
  readonly driveModeOptions = DRIVE_MODE_OPTIONS;

  @Input() value: DriveCommand = { ...DEFAULT_DRIVE_COMMAND };
  @Input() disabled = false;

  @Output() changed = new EventEmitter<DriveCommand>();

  onFieldChanged(key: 'transmission' | 'driveMode', newValue: string): void {
    this.value = { ...this.value, [key]: newValue };
    this.changed.emit(this.value);
  }
}
