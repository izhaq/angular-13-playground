import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {
  CmdTestModel,
  DashboardState,
  LeftPanelPayload,
  FrequentOperationsModel,
} from '../../models/dashboard.models';
import { DEFAULT_OPERATIONS } from '../frequent-operations-list/frequent-operations-list.models';
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
      this.operations = { ...DEFAULT_OPERATIONS };
      this.cmdTest = { ...DEFAULT_CMD_TEST };
      return;
    }
    this.operations = value.operations;
    this.cmdTest = value.cmdTest;
  }

  @Input() readOnly = false;
  @Input() saveBlocked = false;

  @Output() readonly stateChanged = new EventEmitter<LeftPanelPayload>();
  @Output() readonly saved = new EventEmitter<LeftPanelPayload>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly defaultClicked = new EventEmitter<void>();

  operations: FrequentOperationsModel = { ...DEFAULT_OPERATIONS };
  cmdTest: CmdTestModel = { ...DEFAULT_CMD_TEST };

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
      operations: this.operations,
      cmdTest: this.cmdTest,
    };
  }
}
