import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  DEFAULT_OPERATIONS,
  OPERATIONS_FIELDS,
  OperationsKey,
  OperationsValue,
} from './operations-list.models';

@Component({
  selector: 'app-operations-list',
  templateUrl: './operations-list.component.html',
  styleUrls: ['./operations-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsListComponent {
  readonly fields = OPERATIONS_FIELDS;

  @Input() value: OperationsValue = { ...DEFAULT_OPERATIONS };
  @Input() disabled = false;

  @Output() changed = new EventEmitter<OperationsValue>();

  trackByKey(_: number, field: { key: string }): string {
    return field.key;
  }

  onControlChanged(key: OperationsKey, newValue: string | string[]): void {
    this.value = { ...this.value, [key]: newValue };
    this.changed.emit(this.value);
  }
}
