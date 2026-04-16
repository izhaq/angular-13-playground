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

export interface CmdTestValue {
  nta: string;
  tisMtrRec: string;
  rideMtrRec: string;
}

export interface DashboardState {
  scenario: string;
  cmd: CmdSelection;
  operations: OperationsValue;
  cmdTest: CmdTestValue;
}

export interface RareOperationsValue {
  absCriticalFail: string;
  absWarningFail: string;
  absFatalFail: string;
  brakeCriticalFail: string;
  masterResetFail: string;
  flashCriticalFail: string;
  busTempFail: string;
  tireCommFail: string;
  fuelMapTempFail: string;
  coolantCriticalFail: string;
}

export interface RareDashboardState {
  scenario: string;
  cmd: CmdSelection;
  rareOperations: RareOperationsValue;
}

export interface CellValue {
  value: string;
  abbr: string;
}

export interface FieldUpdate {
  field: string;
  cells: Record<string, CellValue>;
}
