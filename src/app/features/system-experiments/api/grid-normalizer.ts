import { COL_IDS, GridColId } from '../shared/ids';
import { SystemExperimentsResponse } from './api-contract';
import { FieldConfig, GridColumn, GridRow } from '../shared/models';

/**
 * Two-step pipeline: wire → flat-grid → rows.
 *
 *   normalizeResponse(response)         → FlatGrid     (knows wire shape)
 *   buildRows(fields, grid, columns)    → GridRow[]    (knows fields + columns)
 *
 * Splitting the concerns means the row builder is fully generic — same
 * function for Primary (8 cols) and Secondary (11 cols). To pull a field
 * out of the grid (e.g. Primary's "Cmd to GS" form-only fields), just
 * don't pass it in the `fields` argument.
 */

/** Multi-select fields carry `string[]` here; joined to comma-string downstream. */
export type CellValues = Record<string, string | string[]>;

/** All grid cells keyed by column id. Missing columns / fields → empty cells. */
export type FlatGrid = Partial<Record<GridColId, CellValues>>;

/** The ONE place that knows the wire response shape. */
export function normalizeResponse(response: SystemExperimentsResponse): FlatGrid {
  const [left, right] = response.entities;
  const grid: FlatGrid = {};

  COL_IDS.left.forEach((id, i) => {
    grid[id] = {
      ...left.mCommands[i].standardFields,
      ...left.mCommands[i].additionalFields,
    } as CellValues;
  });

  COL_IDS.right.forEach((id, i) => {
    grid[id] = {
      ...right.mCommands[i].standardFields,
      ...right.mCommands[i].additionalFields,
    } as CellValues;
  });

  grid[COL_IDS.tll] = { ...left.aCommands  } as CellValues;
  grid[COL_IDS.tlr] = { ...right.aCommands } as CellValues;

  // GDL flat props on entities[0], minus the non-GDL wrappers. Spread-rest
  // is fine because the wire contract is stable — `MultiLocationFields`
  // keys intentionally land here when present. If the contract grows other
  // non-GDL flat props, switch to an explicit allow-list of keys.
  const { entityId: _id, mCommands: _m, aCommands: _a, ...gdlProps } = left;
  grid[COL_IDS.gdl] = gdlProps as unknown as CellValues;

  return grid;
}

/** Caller passes ONLY the fields that should appear as grid rows. */
export function buildRows(
  fields: FieldConfig[],
  grid: FlatGrid,
  columns: GridColumn[],
): GridRow[] {
  return fields.map((field) => ({
    fieldKey: field.key,
    label: field.label,
    values: cellValuesForField(field, grid, columns),
  }));
}

function cellValuesForField(
  field: FieldConfig,
  grid: FlatGrid,
  columns: GridColumn[],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const col of columns) {
    const raw = grid[col.id as GridColId]?.[field.key];
    values[col.id] = abbrFor(field, raw);
  }
  return values;
}

/**
 * Cell rendering rule:
 *   - missing / empty → ''
 *   - known option   → option's `abbr`
 *   - unknown value  → first 3 chars (so QA spots drift instead of staring
 *                      at silently-empty cells)
 *   - array          → each element resolved per the rules above, joined
 *                      with ',' (no space — keeps cells compact against
 *                      the narrow Secondary grid columns)
 */
function abbrFor(field: FieldConfig, value: string | string[] | undefined): string {
  if (value === undefined || value === '') return '';
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value.map((v) => abbrForOne(field, v)).join(',');
  }
  return abbrForOne(field, value);
}

function abbrForOne(field: FieldConfig, value: string): string {
  const match = field.options.find((o) => o.value === value);
  if (match) return match.abbr;
  return value.length <= 3 ? value : value.slice(0, 3);
}
