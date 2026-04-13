export interface CmdSelection {
  sides: string[];
  wheels: string[];
}

export interface OperationsValue {
  ttm: string;
  weather: string;
  videoRec: string;
  videoType: string[];
  headlights: string;
  pwrOnOff: string;
  force: string;
  stability: string;
  cruiseCtrl: string;
  plr: string;
  aux: string;
}

export interface DashboardState {
  scenario: string;
  cmd: CmdSelection;
  operations: OperationsValue;
}

export interface FieldUpdate {
  field: string;
  cells: Record<string, string>;
}
