import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {
  CmdSelection,
  DashboardState,
  LeftPanelPayload,
  OperationsValue,
} from '../../models/dashboard.models';
import { DEFAULT_CMD_SELECTION } from '../cmd-panel/cmd-panel.models';
import { DEFAULT_OPERATIONS } from '../operations-list/operations-list.models';

@Component({
  selector: 'app-left-panel',
  templateUrl: './left-panel.component.html',
  styleUrls: ['./left-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeftPanelComponent {
  @Input() set dashboardState(value: DashboardState | null) {
    if (!value) {
      return;
    }
    this.cmd = value.cmd;
    this.operations = value.operations;
  }

  @Input() disabled = false;

  @Output() stateChanged = new EventEmitter<LeftPanelPayload>();
  @Output() saved = new EventEmitter<LeftPanelPayload>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();

  cmd: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  operations: OperationsValue = { ...DEFAULT_OPERATIONS };

  onCmdChanged(value: CmdSelection): void {
    this.cmd = value;
    this.stateChanged.emit(this.buildPayload());
  }

  onOperationsChanged(value: OperationsValue): void {
    this.operations = value;
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
    };
  }
}
