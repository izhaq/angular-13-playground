/**
 * Wire models for the System Experiments feature.
 *
 * MUST stay byte-compatible with the front-end's `api-contract.ts` —
 * keep field names, casing, and union shapes identical. This is the
 * server-side mirror of what the Angular feature dictates.
 *
 * Kept under `system-experiments/` so the existing `/api/config` flow (different
 * domain, different shape) is not touched.
 */

export type Side = 'left' | 'right';
export type Wheel = '1' | '2' | '3' | '4';
export type EntityId = Side;

/** Primary board's 11 main fields. `videoRecType` is multi-select. */
export interface PrimaryStandardFields {
  tff: string;
  mlmTransmit: string;
  videoRec: string;
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
}

/** Secondary board's 5 TLL/TLR fields (per-side). */
export interface ACommandsData {
  tlCriticalFail: string;
  masterTlFail: string;
  msTlFail: string;
  tlTempFail: string;
  tlToAgCommFail: string;
}

/** Values for ONE column on one side. */
export interface MCommandItem {
  standardFields: PrimaryStandardFields;
  additionalFields: SecondaryAdditionalFields;
}

/** GDL field keys — values live flat on EntityData per wire format. */
export type GdlFieldKey =
  | 'gdlFail'
  | 'gdlTempFail'
  | 'antTransmitPwr'
  | 'antSelectedCmd'
  | 'gdlTransmitPwr'
  | 'uuuAntSelect';

export interface EntityData {
  entityId: EntityId;
  mCommands: [MCommandItem, MCommandItem, MCommandItem, MCommandItem];
  aCommands: ACommandsData;
  gdlFail: string;
  gdlTempFail: string;
  antTransmitPwr: string;
  antSelectedCmd: string;
  gdlTransmitPwr: string;
  uuuAntSelect: string;
}

export interface SystemExperimentsResponse {
  /** Always 2 entities: [left, right]. */
  entities: [EntityData, EntityData];
}

/** Payload sent on Apply for both Primary and Secondary. */
export interface BoardPostPayload {
  sides: Side[];
  wheels: Wheel[];
  fields: Record<string, string | string[]>;
}
