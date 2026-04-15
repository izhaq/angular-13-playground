import { CellValue, CmdTestValue, DashboardState, FieldUpdate, OperationsValue, RareDashboardState, RareOperationsValue } from './models';

type OperationsKey = keyof OperationsValue;
type CmdTestKey = keyof CmdTestValue;
type RareOperationsKey = keyof RareOperationsValue;

const SIDE_PREFIX: Record<string, string> = { left: 'L', right: 'R' };

type AbbrMap = Record<string, string>;

const ABBR_MAPS: Record<string, AbbrMap> = {
  ttm:        { 'not-active': 'N/A', 'real': 'REA', 'captive': 'CAP' },
  weather:    { 'no': 'NO', 'yes': 'YES' },
  videoRec:   { 'internal': 'INT', 'external': 'EXT' },
  videoType:  { 'no': 'NO', 'hd': 'HD', '4k': '4K', '8k': '8K' },
  headlights: { 'no': 'NO', 'yes': 'YES' },
  pwrOnOff:   { 'on': 'ON', 'off': 'OFF' },
  force:      { 'normal': 'NRM', 'force-f': 'FRC', 'force-no': 'FNO' },
  stability:  { 'no': 'NO', 'yes': 'YES' },
  cruiseCtrl: { 'no': 'NO', 'yes': 'YES' },
  plr:        { 'no': 'NO', 'yes': 'YES' },
  aux:        { 'no': 'NO', 'yes': 'YES' },
};

const YES_NO_ABBR: AbbrMap = { 'no': 'NO', 'yes': 'YES' };

const CMD_TEST_ABBR_MAPS: Record<string, AbbrMap> = {
  nta:        YES_NO_ABBR,
  tisMtrRec:  YES_NO_ABBR,
  rideMtrRec: YES_NO_ABBR,
};

const RARE_ABBR_MAPS: Record<string, AbbrMap> = {
  absCalibration: YES_NO_ABBR,
  tractionDiag:   YES_NO_ABBR,
  steeringAlign:  YES_NO_ABBR,
  brakeBleed:     YES_NO_ABBR,
  suspReset:      YES_NO_ABBR,
  eepromFlash:    YES_NO_ABBR,
  canBusLog:      YES_NO_ABBR,
  tirePressInit:  YES_NO_ABBR,
  fuelMapSwitch:  YES_NO_ABBR,
  coolantPurge:   YES_NO_ABBR,
};

const OPERATIONS_KEYS: OperationsKey[] = [
  'ttm', 'weather', 'videoRec', 'videoType',
  'headlights', 'pwrOnOff', 'force', 'stability',
  'cruiseCtrl', 'plr', 'aux',
];

const CMD_TEST_KEYS: CmdTestKey[] = [
  'nta', 'tisMtrRec', 'rideMtrRec',
];

const RARE_OPERATIONS_KEYS: RareOperationsKey[] = [
  'absCalibration', 'tractionDiag', 'steeringAlign', 'brakeBleed',
  'suspReset', 'eepromFlash', 'canBusLog', 'tirePressInit',
  'fuelMapSwitch', 'coolantPurge',
];

function computeColumnIds(sides: string[], wheels: string[]): string[] {
  const columns: string[] = [];
  for (const side of sides) {
    const prefix = SIDE_PREFIX[side] || side.charAt(0).toUpperCase();
    for (const wheel of wheels) {
      columns.push(`${prefix}${wheel}`);
    }
  }
  return columns;
}

function formatValue(val: string | string[]): string {
  return Array.isArray(val) ? val.join(',') : val;
}

function resolveAbbr(rawValue: string, abbrMap?: AbbrMap): string {
  if (!abbrMap) {
    return rawValue;
  }
  if (rawValue.includes(',')) {
    return rawValue
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => abbrMap[part] ?? part)
      .join(',');
  }
  return abbrMap[rawValue] ?? rawValue;
}

function buildCellValue(rawValue: string, abbrMap?: AbbrMap): CellValue {
  return {
    value: rawValue,
    abbr: resolveAbbr(rawValue, abbrMap),
  };
}

const DEFAULT_CMD_TEST: CmdTestValue = {
  nta: 'no',
  tisMtrRec: 'no',
  rideMtrRec: 'no',
};

export function processConfig(state: DashboardState): FieldUpdate[] {
  const columns = computeColumnIds(state.cmd.sides, state.cmd.wheels);
  const ops = state.operations;
  const cmdTest = state.cmdTest || DEFAULT_CMD_TEST;

  const operationUpdates = OPERATIONS_KEYS.map((key) => {
    const rawValue = formatValue(ops[key]);
    const abbrMap = ABBR_MAPS[key];
    const cells: Record<string, CellValue> = {};
    for (const col of columns) {
      cells[col] = buildCellValue(rawValue, abbrMap);
    }
    return { field: key, cells };
  });

  const cmdTestUpdates = CMD_TEST_KEYS.map((key) => {
    const rawValue = cmdTest[key];
    const abbrMap = CMD_TEST_ABBR_MAPS[key];
    const cells: Record<string, CellValue> = {};
    for (const col of columns) {
      cells[col] = buildCellValue(rawValue, abbrMap);
    }
    return { field: key, cells };
  });

  return [...operationUpdates, ...cmdTestUpdates];
}

export function processRareConfig(state: RareDashboardState): FieldUpdate[] {
  const columns = computeColumnIds(state.cmd.sides, state.cmd.wheels);
  const ops = state.rareOperations;

  return RARE_OPERATIONS_KEYS.map((key) => {
    const rawValue = ops[key];
    const abbrMap = RARE_ABBR_MAPS[key];
    const cells: Record<string, CellValue> = {};
    for (const col of columns) {
      cells[col] = buildCellValue(rawValue, abbrMap);
    }
    return { field: key, cells };
  });
}
