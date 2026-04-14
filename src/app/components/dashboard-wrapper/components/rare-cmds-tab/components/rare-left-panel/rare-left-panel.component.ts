import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {
  CmdSelection,
  RareDashboardState,
  RareLeftPanelPayload,
  RareOperationsModel,
} from '../../models/rare-dashboard.models';
import { DEFAULT_CMD_SELECTION } from '../../../cmd-panel/cmd-panel.models';
import { DEFAULT_RARE_OPERATIONS } from '../rare-operations-list/rare-operations-list.models';

@Component({
  selector: 'app-rare-left-panel',
  templateUrl: './rare-left-panel.component.html',
  styleUrls: ['./rare-left-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RareLeftPanelComponent {
  @Input() set dashboardState(value: RareDashboardState | null) {
    if (!value) {
      this.cmd = { ...DEFAULT_CMD_SELECTION };
      this.rareOperations = { ...DEFAULT_RARE_OPERATIONS };
      return;
    }
    this.cmd = value.cmd;
    this.rareOperations = value.rareOperations;
  }

  @Input() disabled = false;

  @Output() stateChanged = new EventEmitter<RareLeftPanelPayload>();
  @Output() saved = new EventEmitter<RareLeftPanelPayload>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();

  cmd: CmdSelection = { ...DEFAULT_CMD_SELECTION };
  rareOperations: RareOperationsModel = { ...DEFAULT_RARE_OPERATIONS };

  onCmdChanged(value: CmdSelection): void {
    this.cmd = value;
    this.stateChanged.emit(this.buildPayload());
  }

  onRareOperationsChanged(value: RareOperationsModel): void {
    this.rareOperations = value;
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

  private buildPayload(): RareLeftPanelPayload {
    return {
      cmd: this.cmd,
      rareOperations: this.rareOperations,
    };
  }
}
