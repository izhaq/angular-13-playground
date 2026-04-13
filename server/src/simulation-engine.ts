import { CmdTestValue, DashboardState, FieldUpdate, OperationsValue } from './models';

type OperationsKey = keyof OperationsValue;
type CmdTestKey = keyof CmdTestValue;

const SIDE_PREFIX: Record<string, string> = { left: 'L', right: 'R' };

const OPERATIONS_KEYS: OperationsKey[] = [
  'ttm', 'weather', 'videoRec', 'videoType',
  'headlights', 'pwrOnOff', 'force', 'stability',
  'cruiseCtrl', 'plr', 'aux',
];

const CMD_TEST_KEYS: CmdTestKey[] = [
  'nta', 'tisMtrRec', 'rideMtrRec',
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
    const cellValue = formatValue(ops[key]);
    const cells: Record<string, string> = {};
    for (const col of columns) {
      cells[col] = cellValue;
    }
    return { field: key, cells };
  });

  const cmdTestUpdates = CMD_TEST_KEYS.map((key) => {
    const cellValue = cmdTest[key];
    const cells: Record<string, string> = {};
    for (const col of columns) {
      cells[col] = cellValue;
    }
    return { field: key, cells };
  });

  return [...operationUpdates, ...cmdTestUpdates];
}
