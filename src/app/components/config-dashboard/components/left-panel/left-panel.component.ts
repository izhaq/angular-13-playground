import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import {
  DashboardState,
  DriveCommand,
  LeftPanelPayload,
  VehicleControls,
} from '../../models/dashboard.models';
import { DEFAULT_DRIVE_COMMAND } from '../cmd-panel/cmd-panel.models';
import { DEFAULT_VEHICLE_CONTROLS } from '../operations-list/operations-list.models';

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
    this.driveCommand = value.driveCommand;
    this.vehicleControls = value.vehicleControls;
  }

  @Input() disabled = false;

  @Output() stateChanged = new EventEmitter<LeftPanelPayload>();
  @Output() saved = new EventEmitter<LeftPanelPayload>();
  @Output() cancelled = new EventEmitter<void>();

  driveCommand: DriveCommand = { ...DEFAULT_DRIVE_COMMAND };
  vehicleControls: VehicleControls = { ...DEFAULT_VEHICLE_CONTROLS };

  onDriveCommandChanged(value: DriveCommand): void {
    this.driveCommand = value;
    this.stateChanged.emit(this.buildPayload());
  }

  onVehicleControlsChanged(value: VehicleControls): void {
    this.vehicleControls = value;
    this.stateChanged.emit(this.buildPayload());
  }

  onSave(): void {
    this.saved.emit(this.buildPayload());
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private buildPayload(): LeftPanelPayload {
    return {
      driveCommand: this.driveCommand,
      vehicleControls: this.vehicleControls,
    };
  }
}
