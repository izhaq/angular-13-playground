import { COL_IDS, GridColId } from '../shared/column-ids';
import { EngineSimResponse } from '../shared/engine-sim.api-contract';
import { FieldConfig, GridColumn, GridRow } from '../shared/engine-sim.models';

/**
 * Two-step pipeline that turns a wire response into rendered grid rows:
 *
 *   normalizeResponse(response)  →  FlatGrid     (knows about wire shape)
 *   buildRows(fields, grid, columns) → GridRow[] (knows about fields + columns)
 *
 * Splitting the concerns means the row builder is fully generic — same
 * function for Primary (8 cols) and Secondary (11 cols), no per-board
 * variants, no `gridColGroup` routing metadata. To pull a field out of the
 * grid (e.g. Primary's "Cmd to GS" form-only fields), just don't pass it in
 * the `fields` argument.
 */

/** Raw wire values for a single grid column, keyed by field key. */
export type CellValues = Record<string, string>;

/** All grid cells keyed by column id. Missing columns / fields → empty cells. */
export type FlatGrid = Partial<Record<GridColId, CellValues>>;

// ---------------------------------------------------------------------------
// Step 1 — wire normalization
// ---------------------------------------------------------------------------

/**
 * The ONE place that knows the wire response shape. Flattens the per-entity
 * wire layout into a column-keyed map the grid can index by `(colId, fieldKey)`.
 *
 * Wire layout reminder:
 *   - `entities[0].mCommands[i].standardFields|additionalFields` → left col i+1
 *   - `entities[1].mCommands[i].standardFields|additionalFields` → right col i+1
 *   - `entities[0].aCommands` → TLL
 *   - `entities[1].aCommands` → TLR
 *   - `entities[0]` flat GDL props → GDL  (entities[1]'s duplicate is ignored)
 */
export function normalizeResponse(response: EngineSimResponse): FlatGrid {
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

  // GDL: the backend's flat GDL props on the entity, minus the non-GDL
  // wrappers (entityId / mCommands / aCommands). Spread-rest is fine here
  // because the wire contract is stable — if it ever grows non-GDL props,
  // switch this to an explicit `GdlFieldKey[]` whitelist.
  const { entityId: _id, mCommands: _m, aCommands: _a, ...gdlProps } = left;
  grid[COL_IDS.gdl] = gdlProps as unknown as CellValues;

  return grid;
}

// ---------------------------------------------------------------------------
// Step 2 — generic row building
// ---------------------------------------------------------------------------

/**
 * Builds one `GridRow` per field. For each `(field, column)` pair, looks up
 * the raw wire value in the normalized grid and renders its abbreviation.
 *
 * Caller passes only the fields that should appear as grid rows. Form-only
 * fields stay out of this argument — there is no flag to filter on.
 */
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
    const raw = grid[col.id]?.[field.key];
    values[col.id] = abbrFor(field, raw);
  }
  return values;
}

/**
 * Cell rendering rule:
 *   - missing / empty wire value → ''
 *   - value matches a known option → option's `abbr`
 *   - value present but unknown → first 3 chars of the value
 *     (so QA can spot drift instead of staring at silently-empty cells)
 */
function abbrFor(field: FieldConfig, value: string | undefined): string {
  if (value === undefined || value === '') return '';
  const match = field.options.find((o) => o.value === value);
  if (match) return match.abbr;
  return value.length <= 3 ? value : value.slice(0, 3);
}
