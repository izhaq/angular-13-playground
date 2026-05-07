import { COL_IDS } from '../shared/ids';
import {
  ACommandsData,
  SystemExperimentsResponse,
  EntityData,
  MCommandItem,
  PrimaryStandardFields,
  SecondaryAdditionalFields,
} from './api-contract';
import { FieldConfig, GridColumn, LabeledOption } from '../shared/models';
import { PRIMARY_COMMANDS_COLUMNS } from '../boards/primary-commands/primary-commands.columns';
import { SECONDARY_COMMANDS_COLUMNS } from '../boards/secondary-commands/secondary-commands.columns';
import { buildRows, normalizeResponse } from './grid-normalizer';

// ---------------------------------------------------------------------------
// Test helpers — keep response building DAMP and intent-revealing.
// ---------------------------------------------------------------------------

const ABCD_OPTIONS: LabeledOption[] = [
  { value: 'a', label: 'Alpha',   abbr: 'A' },
  { value: 'b', label: 'Bravo',   abbr: 'B' },
  { value: 'c', label: 'Charlie', abbr: 'C' },
];

function singleField(key: string, options: LabeledOption[] = ABCD_OPTIONS): FieldConfig {
  return { key, label: key, type: 'single', options, defaultValue: 'a' };
}

function multiField(key: string, options: LabeledOption[] = ABCD_OPTIONS): FieldConfig {
  return { key, label: key, type: 'multi', options, defaultValue: [] };
}

function emptyMItem(): MCommandItem {
  return {
    standardFields:   {} as PrimaryStandardFields,
    additionalFields: {} as SecondaryAdditionalFields,
  };
}

function entity(side: 'left' | 'right', overrides: Partial<EntityData> = {}): EntityData {
  return {
    entityId: side,
    mCommands: [emptyMItem(), emptyMItem(), emptyMItem(), emptyMItem()],
    aCommands: {} as ACommandsData,
    gdlFail: '', gdlTempFail: '',
    antTransmitPwr: '', antSelectedCmd: '',
    gdlTransmitPwr: '', uuuAntSelect: '',
    linkHealth: '',
    ...overrides,
  };
}

function mItemWith(
  standard: Partial<PrimaryStandardFields>,
  additional: Partial<SecondaryAdditionalFields> = {},
): MCommandItem {
  return {
    standardFields:   standard   as PrimaryStandardFields,
    additionalFields: additional as SecondaryAdditionalFields,
  };
}

function response(left: EntityData, right: EntityData): SystemExperimentsResponse {
  return { entities: [left, right] };
}

// ---------------------------------------------------------------------------
// normalizeResponse — wire-shape knowledge lives here only
// ---------------------------------------------------------------------------

describe('normalizeResponse', () => {

  it('routes left.mCommands[i] (standard + additional merged) into left{i+1}', () => {
    const left = entity('left', {
      mCommands: [
        mItemWith({ tff: 'a' } as any, { whlFatalFail: 'x' }),
        mItemWith({ tff: 'b' } as any),
        mItemWith({ tff: 'c' } as any),
        mItemWith({ tff: 'a' } as any),
      ],
    });

    const grid = normalizeResponse(response(left, entity('right')));

    expect(grid.left1).toEqual(jasmine.objectContaining({ tff: 'a', whlFatalFail: 'x' }));
    expect(grid.left2!['tff']).toBe('b');
    expect(grid.left3!['tff']).toBe('c');
    expect(grid.left4!['tff']).toBe('a');
  });

  it('routes right.mCommands[i] into right{i+1} independently of left', () => {
    const right = entity('right', {
      mCommands: [
        mItemWith({ tff: 'a' } as any),
        mItemWith({ tff: 'b' } as any),
        mItemWith({ tff: 'c' } as any),
        mItemWith({ tff: 'a' } as any),
      ],
    });

    const grid = normalizeResponse(response(entity('left'), right));

    expect([
      grid.right1!['tff'], grid.right2!['tff'],
      grid.right3!['tff'], grid.right4!['tff'],
    ]).toEqual(['a', 'b', 'c', 'a']);
  });

  it('routes left.aCommands → tll and right.aCommands → tlr', () => {
    const left  = entity('left',  { aCommands: { tlCriticalFail: 'a' } as ACommandsData });
    const right = entity('right', { aCommands: { tlCriticalFail: 'b' } as ACommandsData });

    const grid = normalizeResponse(response(left, right));

    expect(grid.tll).toEqual(jasmine.objectContaining({ tlCriticalFail: 'a' }));
    expect(grid.tlr).toEqual(jasmine.objectContaining({ tlCriticalFail: 'b' }));
  });

  it('routes left entity flat GDL props into the gdl cell (right entity is ignored)', () => {
    const left  = entity('left',  { gdlFail: 'a', antTransmitPwr: 'b' });
    const right = entity('right', { gdlFail: 'IGNORED', antTransmitPwr: 'IGNORED' });

    const grid = normalizeResponse(response(left, right));

    expect(grid.gdl).toEqual(jasmine.objectContaining({
      gdlFail: 'a',
      antTransmitPwr: 'b',
    }));
  });

  it('does not leak entityId / mCommands / aCommands into the gdl cell', () => {
    const grid = normalizeResponse(response(entity('left'), entity('right')));

    expect(grid.gdl!['entityId']).toBeUndefined();
    expect(grid.gdl!['mCommands']).toBeUndefined();
    expect(grid.gdl!['aCommands']).toBeUndefined();
  });

});

// ---------------------------------------------------------------------------
// buildRows — generic, board-agnostic
// ---------------------------------------------------------------------------

describe('buildRows', () => {

  it('emits one row per field, in the order given', () => {
    const grid = normalizeResponse(response(entity('left'), entity('right')));
    const fields = [singleField('tff'), singleField('mlmTransmit')];

    const rows = buildRows(fields, grid, PRIMARY_COMMANDS_COLUMNS);

    expect(rows.map((r) => r.fieldKey)).toEqual(['tff', 'mlmTransmit']);
    expect(rows[0].label).toBe('tff');
  });

  it('looks up the field-specific abbreviation per column', () => {
    const left = entity('left', {
      mCommands: [
        mItemWith({ tff: 'a' } as any),
        mItemWith({ tff: 'b' } as any),
        mItemWith({ tff: 'c' } as any),
        mItemWith({ tff: 'a' } as any),
      ],
    });
    const right = entity('right', {
      mCommands: [
        mItemWith({ tff: 'b' } as any),
        mItemWith({ tff: 'c' } as any),
        mItemWith({ tff: 'a' } as any),
        mItemWith({ tff: 'b' } as any),
      ],
    });

    const grid = normalizeResponse(response(left, right));
    const [row] = buildRows([singleField('tff')], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(row.values).toEqual({
      left1: 'A', left2: 'B', left3: 'C', left4: 'A',
      right1: 'B', right2: 'C', right3: 'A', right4: 'B',
    });
  });

  it('renders empty cells when wire value is missing', () => {
    const grid = normalizeResponse(response(entity('left'), entity('right')));
    const [row] = buildRows([singleField('tff')], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(Object.values(row.values).every((v) => v === '')).toBe(true);
  });

  it('falls back to the first 3 chars of the raw value when no option matches', () => {
    const left = entity('left', {
      mCommands: [
        mItemWith({ tff: 'unexpected' } as any), // → 'une'
        mItemWith({ tff: 'no' } as any),         // shorter than 3 → 'no'
        emptyMItem(),
        emptyMItem(),
      ],
    });

    const grid = normalizeResponse(response(left, entity('right')));
    const [row] = buildRows([singleField('tff')], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(row.values['left1']).toBe('une');
    expect(row.values['left2']).toBe('no');
  });

  it('writes only to the columns it is given (Primary 8 vs Secondary 11)', () => {
    const left  = entity('left',  { aCommands: { tlCriticalFail: 'a' } as ACommandsData });
    const right = entity('right', { aCommands: { tlCriticalFail: 'b' } as ACommandsData });
    const grid = normalizeResponse(response(left, right));

    const tllField = singleField('tlCriticalFail');

    const primaryRow   = buildRows([tllField], grid, PRIMARY_COMMANDS_COLUMNS)[0];
    const secondaryRow = buildRows([tllField], grid, SECONDARY_COMMANDS_COLUMNS)[0];

    expect(Object.keys(primaryRow.values)).toEqual(
      [...COL_IDS.left, ...COL_IDS.right],
    );
    expect(Object.values(primaryRow.values).every((v) => v === '')).toBe(true);

    expect(secondaryRow.values[COL_IDS.tll]).toBe('A');
    expect(secondaryRow.values[COL_IDS.tlr]).toBe('B');
    expect(secondaryRow.values[COL_IDS.left[0]]).toBe('');
  });

  it('treats every non-passed field as form-only (no row in the grid)', () => {
    const grid = normalizeResponse(response(entity('left'), entity('right')));

    const formOnly = singleField('teo');
    const gridOnly = singleField('tff');

    const rows = buildRows([gridOnly], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(rows.map((r) => r.fieldKey)).toEqual(['tff']);
    expect(rows.find((r) => r.fieldKey === formOnly.key)).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // Multi-select cells — backend sends `string[]`, normalizer joins on ','
  // -------------------------------------------------------------------------

  it('joins multi-select array values into a comma-separated abbr string', () => {
    const left = entity('left', {
      mCommands: [
        mItemWith({ videoRecType: ['a', 'b', 'c'] } as any), // → 'A,B,C'
        mItemWith({ videoRecType: ['a'] } as any),           // single-element array → 'A'
        emptyMItem(),
        emptyMItem(),
      ],
    });

    const grid = normalizeResponse(response(left, entity('right')));
    const [row] = buildRows([multiField('videoRecType')], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(row.values['left1']).toBe('A,B,C');
    expect(row.values['left2']).toBe('A');
  });

  it('renders an empty cell for an empty multi-select array', () => {
    const left = entity('left', {
      mCommands: [
        mItemWith({ videoRecType: [] } as any),
        emptyMItem(),
        emptyMItem(),
        emptyMItem(),
      ],
    });

    const grid = normalizeResponse(response(left, entity('right')));
    const [row] = buildRows([multiField('videoRecType')], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(row.values['left1']).toBe('');
  });

  it('mixes known and unknown values in a multi-select using the same fallback rule', () => {
    const left = entity('left', {
      mCommands: [
        // 'a' → 'A' (known); 'unexpected' → 'une' (unknown, sliced to 3)
        mItemWith({ videoRecType: ['a', 'unexpected'] } as any),
        emptyMItem(),
        emptyMItem(),
        emptyMItem(),
      ],
    });

    const grid = normalizeResponse(response(left, entity('right')));
    const [row] = buildRows([multiField('videoRecType')], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(row.values['left1']).toBe('A,une');
  });

  it('handles array shape on a single-select field defensively (still joins)', () => {
    // Defensive case: backend drift sends an array for a `single` field.
    // We render rather than crash — the comma-joined output makes the
    // drift visible to QA without breaking the grid.
    const left = entity('left', {
      mCommands: [
        mItemWith({ tff: ['a', 'b'] } as any),
        emptyMItem(),
        emptyMItem(),
        emptyMItem(),
      ],
    });

    const grid = normalizeResponse(response(left, entity('right')));
    const [row] = buildRows([singleField('tff')], grid, PRIMARY_COMMANDS_COLUMNS);

    expect(row.values['left1']).toBe('A,B');
  });

  // -------------------------------------------------------------------------
  // Multi-location fields — same key may appear in any combination of the
  // three secondary structures (additionalFields, aCommands, GDL flat props).
  //
  // The normalizer was designed for this on day one — it spreads each wire
  // structure into its own column slot and the row builder iterates ALL
  // columns looking up the key. There is no per-field "where does this
  // live" routing; the wire location IS the routing.
  //
  // These tests lock that property in: future refactors that try to
  // optimize the normalizer by indexing fields → location (one canonical
  // location per key) will break here and force the conversation.
  // -------------------------------------------------------------------------

  /**
   * Helper: builds a secondary response where a SAME-KEYED field appears in
   * any subset of the three structures. Each structure that should host the
   * key takes a `string` value; structures left out get an empty object.
   */
  function multiLocationResponse(
    fieldKey: string,
    locations: {
      leftWheels?:  Partial<Record<0 | 1 | 2 | 3, string>>;
      rightWheels?: Partial<Record<0 | 1 | 2 | 3, string>>;
      tll?: string;
      tlr?: string;
      gdl?: string;
    },
  ): SystemExperimentsResponse {
    const wheelMItem = (cmds: Partial<Record<0 | 1 | 2 | 3, string>>, idx: 0 | 1 | 2 | 3) =>
      cmds[idx] !== undefined
        ? mItemWith({}, { [fieldKey]: cmds[idx]! } as any)
        : emptyMItem();

    const left = entity('left', {
      mCommands: [
        wheelMItem(locations.leftWheels ?? {}, 0),
        wheelMItem(locations.leftWheels ?? {}, 1),
        wheelMItem(locations.leftWheels ?? {}, 2),
        wheelMItem(locations.leftWheels ?? {}, 3),
      ],
      aCommands: (locations.tll !== undefined
        ? { [fieldKey]: locations.tll }
        : {}) as unknown as ACommandsData,
      ...(locations.gdl !== undefined ? { [fieldKey]: locations.gdl } : {}),
    });
    const right = entity('right', {
      mCommands: [
        wheelMItem(locations.rightWheels ?? {}, 0),
        wheelMItem(locations.rightWheels ?? {}, 1),
        wheelMItem(locations.rightWheels ?? {}, 2),
        wheelMItem(locations.rightWheels ?? {}, 3),
      ],
      aCommands: (locations.tlr !== undefined
        ? { [fieldKey]: locations.tlr }
        : {}) as unknown as ACommandsData,
    });
    return response(left, right);
  }

  it('multi-location: same key in additionalFields only fills wheel cells, leaves TLL/TLR/GDL empty', () => {
    const grid = normalizeResponse(multiLocationResponse('linkHealth', {
      leftWheels:  { 0: 'a', 1: 'b', 2: 'c', 3: 'a' },
      rightWheels: { 0: 'b', 1: 'c', 2: 'a', 3: 'b' },
    }));
    const [row] = buildRows([singleField('linkHealth')], grid, SECONDARY_COMMANDS_COLUMNS);

    expect(row.values).toEqual({
      left1: 'A', left2: 'B', left3: 'C', left4: 'A',
      right1: 'B', right2: 'C', right3: 'A', right4: 'B',
      tll: '', tlr: '', gdl: '',
    });
  });

  it('multi-location: same key in aCommands only fills TLL/TLR, leaves wheels and GDL empty', () => {
    const grid = normalizeResponse(multiLocationResponse('linkHealth', {
      tll: 'a',
      tlr: 'b',
    }));
    const [row] = buildRows([singleField('linkHealth')], grid, SECONDARY_COMMANDS_COLUMNS);

    expect(row.values[COL_IDS.tll]).toBe('A');
    expect(row.values[COL_IDS.tlr]).toBe('B');
    expect(row.values[COL_IDS.gdl]).toBe('');
    expect([...COL_IDS.left, ...COL_IDS.right].every((c) => row.values[c] === '')).toBe(true);
  });

  it('multi-location: same key in GDL only fills the GDL cell, leaves all others empty', () => {
    const grid = normalizeResponse(multiLocationResponse('linkHealth', { gdl: 'a' }));
    const [row] = buildRows([singleField('linkHealth')], grid, SECONDARY_COMMANDS_COLUMNS);

    expect(row.values[COL_IDS.gdl]).toBe('A');
    expect(
      [...COL_IDS.left, ...COL_IDS.right, COL_IDS.tll, COL_IDS.tlr]
        .every((c) => row.values[c] === ''),
    ).toBe(true);
  });

  it('multi-location: same key in additionalFields + GDL fills wheels + GDL, leaves TLL/TLR empty', () => {
    const grid = normalizeResponse(multiLocationResponse('linkHealth', {
      leftWheels:  { 0: 'a', 1: 'b', 2: 'c', 3: 'a' },
      rightWheels: { 0: 'b', 1: 'c', 2: 'a', 3: 'b' },
      gdl: 'c',
    }));
    const [row] = buildRows([singleField('linkHealth')], grid, SECONDARY_COMMANDS_COLUMNS);

    expect(row.values[COL_IDS.left[0]]).toBe('A');
    expect(row.values[COL_IDS.right[3]]).toBe('B');
    expect(row.values[COL_IDS.gdl]).toBe('C');
    expect(row.values[COL_IDS.tll]).toBe('');
    expect(row.values[COL_IDS.tlr]).toBe('');
  });

  it('multi-location: same key in all three structures fills every one of the 11 columns', () => {
    const grid = normalizeResponse(multiLocationResponse('linkHealth', {
      leftWheels:  { 0: 'a', 1: 'b', 2: 'c', 3: 'a' },
      rightWheels: { 0: 'b', 1: 'c', 2: 'a', 3: 'b' },
      tll: 'a',
      tlr: 'b',
      gdl: 'c',
    }));
    const [row] = buildRows([singleField('linkHealth')], grid, SECONDARY_COMMANDS_COLUMNS);

    expect(Object.values(row.values).every((v) => v !== '')).toBe(true);
    expect(row.values[COL_IDS.tll]).toBe('A');
    expect(row.values[COL_IDS.tlr]).toBe('B');
    expect(row.values[COL_IDS.gdl]).toBe('C');
  });

  it('multi-location: same key partially populated across wheels — only the present cells fill', () => {
    // Backend sends the field in L1 + L3 + R2 only — every other wheel
    // cell is intentionally empty. The grid mirrors the wire exactly.
    const grid = normalizeResponse(multiLocationResponse('linkHealth', {
      leftWheels:  { 0: 'a', 2: 'b' },
      rightWheels: { 1: 'c' },
    }));
    const [row] = buildRows([singleField('linkHealth')], grid, SECONDARY_COMMANDS_COLUMNS);

    expect(row.values[COL_IDS.left[0]]).toBe('A');
    expect(row.values[COL_IDS.left[1]]).toBe('');
    expect(row.values[COL_IDS.left[2]]).toBe('B');
    expect(row.values[COL_IDS.left[3]]).toBe('');
    expect(row.values[COL_IDS.right[0]]).toBe('');
    expect(row.values[COL_IDS.right[1]]).toBe('C');
    expect(row.values[COL_IDS.right[2]]).toBe('');
    expect(row.values[COL_IDS.right[3]]).toBe('');
  });

  it('multi-location: keys in different structures do not overwrite each other', () => {
    // Two different fields with the same wire location pattern — proves the
    // normalizer keys cells by (column, fieldKey) not by location identity.
    const grid = normalizeResponse(multiLocationResponse('linkHealth', {
      leftWheels: { 0: 'a' },
      gdl: 'b',
    }));
    // Layer a second key onto the same response by mutating before reading.
    grid[COL_IDS.left[0]]!['otherFlag'] = 'c';
    grid[COL_IDS.gdl]!['otherFlag']     = 'a';

    const [linkRow, otherRow] = buildRows(
      [singleField('linkHealth'), singleField('otherFlag')],
      grid,
      SECONDARY_COMMANDS_COLUMNS,
    );

    expect(linkRow.values[COL_IDS.left[0]]).toBe('A');
    expect(linkRow.values[COL_IDS.gdl]).toBe('B');
    expect(otherRow.values[COL_IDS.left[0]]).toBe('C');
    expect(otherRow.values[COL_IDS.gdl]).toBe('A');
  });

});
