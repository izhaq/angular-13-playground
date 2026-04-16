import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  CMD_TEST_FIELDS,
  CmdTestKey,
  CmdTestModel,
  DEFAULT_CMD_TEST,
} from './cmd-test-panel.models';

@Component({
  selector: 'app-cmd-test-panel',
  templateUrl: './cmd-test-panel.component.html',
  styleUrls: ['./cmd-test-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmdTestPanelComponent {
  readonly fields = CMD_TEST_FIELDS;

  @Input() value: CmdTestModel = { ...DEFAULT_CMD_TEST };
  @Input() disabled = false;

  @Output() readonly changed = new EventEmitter<CmdTestModel>();

  trackByKey(_: number, field: { key: string }): string {
    return field.key;
  }

  getStringValue(key: CmdTestKey): string {
    return this.value[key];
  }

  onControlChanged(key: CmdTestKey, newValue: string): void {
    this.value = { ...this.value, [key]: newValue };
    this.changed.emit(this.value);
  }
}
