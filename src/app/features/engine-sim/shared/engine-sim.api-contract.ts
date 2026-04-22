import { Side, Wheel } from './option-values';

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
 * lives in `engine-sim.models.ts`.
 */

// ---------------------------------------------------------------------------
// GET + WebSocket Response
// ---------------------------------------------------------------------------

export interface EngineSimResponse {
  entities: [EntityData, EntityData]; // [Left, Right]
}

export interface EntityData {
  entityId: 0 | 1;
  mCommands: MCommandItem[];
  aCommands: ACommandsData;
  aProp1: string;
  aProp2: string;
  aProp3: string;
  aProp4: string;
  aProp5: string;
}

export interface MCommandItem {
  standardFields: Record<string, ColumnValues>;
  additionalFields: Record<string, ColumnValues>;
}

export type ACommandsData = Record<string, string>;

/** One value per wheel (1-4) within a single side. */
export type ColumnValues = [string, string, string, string];

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

export interface EngineSimApiConfig {
  primaryPostUrl: string;
  secondaryPostUrl: string;
  getUrl: string;
  wsUrl: string;
}
