import { Side, Wheel } from '../shared/option-values';

/**
 * Wire format — what the backend dictates.
 *
 * This file contains every type that crosses the network boundary
 * (GET response, WebSocket frames, POST payloads, runtime config).
 * Keep it quarantined from internally-owned view models so a backend
 * change is a one-file question.
 *
 * Rule of thumb: if a type's shape would change because the backend
 * changed, it lives here. If it changes because we changed our UI, it
 * lives in `shared/models.ts`.
 */

// ---------------------------------------------------------------------------
// GET + WebSocket Response
// ---------------------------------------------------------------------------

export type EntityId = 'left' | 'right';

export interface SystemExperimentsResponse {
  /** Always 2 entities: [left, right]. */
  entities: [EntityData, EntityData];
}

export interface EntityData {
  entityId: EntityId;
  /**
   * 4 items, one per column on this side.
   * Left entity:  mCommands[0..3] → grid cols L1..L4
   * Right entity: mCommands[0..3] → grid cols R1..R4
   */
  mCommands: [MCommandItem, MCommandItem, MCommandItem, MCommandItem];
  /**
   * Per-side TLL/TLR data.
   * Left entity → TLL column. Right entity → TLR column.
   */
  aCommands: ACommandsData;

  // -- GDL column (flat on entity per backend wire format) -------------------
  // Side-independent — backend duplicates these fields across both entities
  // for symmetry; the grid reads from `entities[0]` only.
  gdlFail: string;
  gdlTempFail: string;
  antTransmitPwr: string;
  antSelectedCmd: string;
  gdlTransmitPwr: string;
  uuuAntSelect: string;

  // -- Multi-location fields (also live in mCommands.additionalFields and
  //    aCommands; backend may emit them in any subset of the three).
  //    Optional here because absence is meaningful — empty cell, not zero.
  linkHealth?: string;
}

/** Values for ONE column on one side. */
export interface MCommandItem {
  /** Primary board fields — drive the 8-col grid rows. */
  standardFields: PrimaryStandardFields;
  /** Secondary board fields targeting first 8 cols (3 fields). */
  additionalFields: SecondaryAdditionalFields;
}

/** Primary board's 11 main fields (Cmd-to-GS sub-section is form-only — not on the wire). */
export interface PrimaryStandardFields {
  tff: string;
  mlmTransmit: string;
  videoRec: string;
  /**
   * Multi-select on the form — the wire carries the user's full picked
   * set per cell. The grid joins the values into one comma-separated
   * string in the normalizer (see grid-normalizer.ts → `abbrFor`); the
   * cell template stays single-string so nothing else has to change.
   */
  videoRecType: string | string[];
  mtrRec: string;
  speedPwrOnOff: string;
  forceTtl: string;
  nuu: string;
  muDump: string;
  sendMtrTss: string;
  abort: string;
}

/** Secondary board's 3 fields targeting first 8 cols. */
export interface SecondaryAdditionalFields {
  whlCriticalFail: string;
  whlWarningFail: string;
  whlFatalFail: string;

  // Multi-location — backend may also send `linkHealth` on this struct.
  linkHealth?: string;
}

/** Secondary board's 5 TLL/TLR fields (per-side: left entity → TLL, right → TLR). */
export interface ACommandsData {
  tlCriticalFail: string;
  masterTlFail: string;
  msTlFail: string;
  tlTempFail: string;
  tlToAgCommFail: string;

  // Multi-location — backend may also send `linkHealth` on this struct.
  linkHealth?: string;
}

/**
 * Field keys for Secondary's GDL column. The values themselves live flat on
 * `EntityData` (backend wire format has no `gdl` wrapper). This union exists
 * so the grid-data util can iterate the GDL group without redeclaring the keys.
 */
export type GdlFieldKey =
  | 'gdlFail'
  | 'gdlTempFail'
  | 'antTransmitPwr'
  | 'antSelectedCmd'
  | 'gdlTransmitPwr'
  | 'uuuAntSelect'
  | 'linkHealth';

// ---------------------------------------------------------------------------
// POST Payload (one per board, sent on Apply)
// ---------------------------------------------------------------------------

export interface BoardPostPayload {
  sides: Side[];
  wheels: Wheel[];
  fields: Record<string, string | string[]>;
}

// ---------------------------------------------------------------------------
// API Configuration (injection token shape)
// ---------------------------------------------------------------------------

export interface SystemExperimentsApiConfig {
  primaryPostUrl: string;
  secondaryPostUrl: string;
  getUrl: string;
  wsUrl: string;
}
