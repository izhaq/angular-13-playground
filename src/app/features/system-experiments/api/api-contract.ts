import { Side, Wheel } from '../shared/option-values';

/**
 * Wire format — types that cross the network boundary (GET response,
 * WebSocket frames, POST payloads, runtime config). Quarantined from
 * internally-owned view models (`shared/models.ts`) so a backend change
 * is a one-file question.
 */

export type EntityId = 'left' | 'right';

export interface SystemExperimentsResponse {
  /** Always 2 entities: [left, right]. */
  entities: [EntityData, EntityData];
}

/**
 * Fields that ride on more than one wire structure simultaneously.
 * The same key carries the same value in any combination of:
 *   - `EntityData` (flat — also routes to the GDL grid column)
 *   - `MCommandItem.additionalFields` (per side + wheel)
 *   - `EntityData.aCommands` (per side)
 * Apply writes to all matching slots; the grid renders whichever
 * structures the backend populates. Empty `string` value = empty cell.
 */
export interface MultiLocationFields {
  linkHealth: string;
}

export interface EntityData extends MultiLocationFields {
  entityId: EntityId;
  /** 4 items, one per column on this side. Left → L1..L4, Right → R1..R4. */
  mCommands: [MCommandItem, MCommandItem, MCommandItem, MCommandItem];
  /** Per-side TLL/TLR. Left → TLL, Right → TLR. */
  aCommands: ACommandsData;

  // GDL column — flat on entity. Backend duplicates across both entities for
  // symmetry; the grid reads from `entities[0]` only.
  gdlFail: string;
  gdlTempFail: string;
  antTransmitPwr: string;
  antSelectedCmd: string;
  gdlTransmitPwr: string;
  uuuAntSelect: string;
}

export interface MCommandItem {
  standardFields: PrimaryStandardFields;
  additionalFields: SecondaryAdditionalFields;
}

/** Primary board's 11 main fields (Cmd-to-GS sub-section is form-only — not on the wire). */
export interface PrimaryStandardFields {
  tff: string;
  mlmTransmit: string;
  videoRec: string;
  /** Multi-select: wire carries the user's full picked set per cell. */
  videoRecType: string | string[];
  mtrRec: string;
  speedPwrOnOff: string;
  forceTtl: string;
  nuu: string;
  muDump: string;
  sendMtrTss: string;
  abort: string;
}

export interface SecondaryAdditionalFields extends MultiLocationFields {
  whlCriticalFail: string;
  whlWarningFail: string;
  whlFatalFail: string;
}

export interface ACommandsData extends MultiLocationFields {
  tlCriticalFail: string;
  masterTlFail: string;
  msTlFail: string;
  tlTempFail: string;
  tlToAgCommFail: string;
}

/**
 * Field keys NATIVE to Secondary's GDL column (flat on `EntityData`).
 * Multi-location keys (see `MultiLocationFields`) can also land in the
 * GDL column when present on `entities[0]`, but they don't belong here.
 */
export type GdlFieldKey =
  | 'gdlFail'
  | 'gdlTempFail'
  | 'antTransmitPwr'
  | 'antSelectedCmd'
  | 'gdlTransmitPwr'
  | 'uuuAntSelect';

export interface BoardPostPayload {
  sides: Side[];
  wheels: Wheel[];
  fields: Record<string, string | string[]>;
}

export interface TestModePayload {
  mode: 'active' | 'inactive';
}

export interface SystemExperimentsApiConfig {
  primaryPostUrl: string;
  secondaryPostUrl: string;
  defaultUrl: string;
  testModeUrl: string;
  getUrl: string;
  wsUrl: string;
}
