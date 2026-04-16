import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {
  RareDashboardState,
  RareLeftPanelPayload,
  RareOperationsModel,
} from '../../models/rare-dashboard.models';
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
      this.rareOperations = { ...DEFAULT_RARE_OPERATIONS };
      return;
    }
    this.rareOperations = value.rareOperations;
  }

  @Input() disabled = false;

  @Output() stateChanged = new EventEmitter<RareLeftPanelPayload>();
  @Output() saved = new EventEmitter<RareLeftPanelPayload>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() defaultClicked = new EventEmitter<void>();

  rareOperations: RareOperationsModel = { ...DEFAULT_RARE_OPERATIONS };

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
      rareOperations: this.rareOperations,
    };
  }
}
