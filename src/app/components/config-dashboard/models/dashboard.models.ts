import { DriveCommand } from '../components/cmd-panel/cmd-panel.models';
import { VehicleControls } from '../components/operations-list/operations-list.models';

export { DriveCommand, VehicleControls };

export interface DashboardState {
  scenario: string;
  driveCommand: DriveCommand;
  vehicleControls: VehicleControls;
}

export interface LeftPanelPayload {
  driveCommand: DriveCommand;
  vehicleControls: VehicleControls;
}
