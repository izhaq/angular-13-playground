import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  DEFAULT_RARE_OPERATIONS,
  RARE_OPERATIONS_FIELDS,
  RareOperationsKey,
  RareOperationsModel,
} from './rare-operations-list.models';

@Component({
  selector: 'app-rare-operations-list',
  templateUrl: './rare-operations-list.component.html',
  styleUrls: ['./rare-operations-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RareOperationsListComponent {
  readonly fields = RARE_OPERATIONS_FIELDS;

  @Input() value: RareOperationsModel = { ...DEFAULT_RARE_OPERATIONS };
  @Input() disabled = false;

  @Output() readonly changed = new EventEmitter<RareOperationsModel>();

  trackByKey(_: number, field: { key: string }): string {
    return field.key;
  }

  onControlChanged(key: RareOperationsKey, newValue: string): void {
    this.value = { ...this.value, [key]: newValue };
    this.changed.emit(this.value);
  }
}
