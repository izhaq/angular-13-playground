import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  DEFAULT_VEHICLE_CONTROLS,
  VEHICLE_CONTROL_FIELDS,
  VehicleControlKey,
  VehicleControls,
} from './operations-list.models';

@Component({
  selector: 'app-operations-list',
  templateUrl: './operations-list.component.html',
  styleUrls: ['./operations-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationsListComponent {
  readonly terrainField = VEHICLE_CONTROL_FIELDS[0];
  readonly weatherField = VEHICLE_CONTROL_FIELDS[1];
  readonly speedLimitField = VEHICLE_CONTROL_FIELDS[2];
  readonly gearField = VEHICLE_CONTROL_FIELDS[3];
  readonly headlightsField = VEHICLE_CONTROL_FIELDS[4];
  readonly wipersField = VEHICLE_CONTROL_FIELDS[5];
  readonly tractionCtrlField = VEHICLE_CONTROL_FIELDS[6];
  readonly stabilityField = VEHICLE_CONTROL_FIELDS[7];
  readonly cruiseCtrlField = VEHICLE_CONTROL_FIELDS[8];
  readonly brakeAssistField = VEHICLE_CONTROL_FIELDS[9];

  @Input() value: VehicleControls = { ...DEFAULT_VEHICLE_CONTROLS };
  @Input() disabled = false;

  @Output() changed = new EventEmitter<VehicleControls>();

  onControlChanged(key: VehicleControlKey, newValue: string | string[]): void {
    this.value = { ...this.value, [key]: newValue };
    this.changed.emit(this.value);
  }
}
