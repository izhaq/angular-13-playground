import { DashboardState, FieldUpdate, OperationsValue } from './models';

type OperationsKey = keyof OperationsValue;

const SIDE_PREFIX: Record<string, string> = { left: 'L', right: 'R' };

const OPERATIONS_KEYS: OperationsKey[] = [
  'ttm', 'weather', 'videoRec', 'videoType',
  'headlights', 'pwrOnOff', 'force', 'stability',
  'cruiseCtrl', 'plr', 'aux',
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

export function processConfig(state: DashboardState): FieldUpdate[] {
  const columns = computeColumnIds(state.cmd.sides, state.cmd.wheels);
  const ops = state.operations;

  return OPERATIONS_KEYS.map((key) => {
    const raw = ops[key];
    const cellValue = formatValue(raw);

    const cells: Record<string, string> = {};
    for (const col of columns) {
      cells[col] = cellValue;
    }

    return { field: key, cells };
  });
}
