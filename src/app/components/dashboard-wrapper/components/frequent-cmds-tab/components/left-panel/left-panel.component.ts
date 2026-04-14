import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {
  CmdSelection,
  CmdTestModel,
  DashboardState,
  LeftPanelPayload,
  FrequentOperationsModel,
} from '../../models/dashboard.models';
import { DEFAULT_CMD_SELECTION } from '../../../cmd-panel/cmd-panel.models';
import { DEFAULT_OPERATIONS } from '../operations-list/operations-list.models';
import { DEFAULT_CMD_TEST } from '../cmd-test-panel/cmd-test-panel.models';

@Component({
  selector: 'app-left-panel',
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPanelComponent {
  @Input() set dashboardState(value: DashboardState | null) {
    if (!value) {
      this.cmd = { ...DEFAULT_CMD_SELECTION };
      this.operations = { ...DEFAULT_OPERATIONS };
      this.cmdTest = { ...DEFAULT_CMD_TEST };
      return;
    }
    this.cmd = value.cmd;
    this.operations = value.operations;
    this.cmdTest = value.cmdTest;
  }

  @Input() disabled = false;

  @Output() stateChanged = new EventEmitter<LeftPanelPayload>();
  @Output() saved = new EventEmitter<LeftPanelPayload>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();

  cmd: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  operations: FrequentOperationsModel = { ...DEFAULT_OPERATIONS };
  cmdTest: CmdTestModel = { ...DEFAULT_CMD_TEST };

  onCmdChanged(value: CmdSelection): void {
    this.cmd = value;
    this.stateChanged.emit(this.buildPayload());
  }

  onOperationsChanged(value: FrequentOperationsModel): void {
    this.operations = value;
    this.stateChanged.emit(this.buildPayload());
  }

  onCmdTestChanged(value: CmdTestModel): void {
    this.cmdTest = value;
    this.stateChanged.emit(this.buildPayload());
  }

  onSave(): void {
    this.saved.emit(this.buildPayload());
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onDefault(): void {
    this.defaultClicked.emit();
  }

  private buildPayload(): LeftPanelPayload {
    return {
      cmd: this.cmd,
      operations: this.operations,
      cmdTest: this.cmdTest,
    };
  }
}
