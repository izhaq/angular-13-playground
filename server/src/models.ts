export interface DriveCommand {
  transmission: string;
  driveMode: string;
}

export interface VehicleControls {
  terrain: string[];
  weather: string[];
  speedLimit: string;
  gear: string;
  headlights: string;
  wipers: string;
  tractionCtrl: string;
  stability: string;
  cruiseCtrl: string;
  brakeAssist: string;
}

export interface DashboardState {
  scenario: string;
  driveCommand: DriveCommand;
  vehicleControls: VehicleControls;
}

export interface FieldUpdate {
  field: string;
  value?: string;
  statuses?: Record<string, boolean>;
}
