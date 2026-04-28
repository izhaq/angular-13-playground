import { SystemExperimentsResponse } from './api-contract';
import {
  PRIMARY_COMMANDS_MAIN_FIELDS,
  buildPrimaryCommandsDefaults,
} from '../boards/primary-commands/primary-commands.fields';
import {
  SECONDARY_COMMANDS_8COL_FIELDS,
  SECONDARY_COMMANDS_GDL_FIELDS,
  SECONDARY_COMMANDS_MULTI_LOCATION_FIELDS,
  SECONDARY_COMMANDS_TLL_TLR_FIELDS,
  buildSecondaryCommandsDefaults,
} from '../boards/secondary-commands/secondary-commands.fields';

/**
 * Distills the GET (and first WS) response into one form value per board,
 * picking the "first cell" of each backend slot:
 *
 *   primary.<key>   ← entities[0].mCommands[0].standardFields[<key>]
 *   secondary 8-col ← entities[0].mCommands[0].additionalFields[<key>]
 *   secondary TL    ← entities[0].aCommands[<key>]
 *   secondary GDL   ← entities[0][<key>]
 *
 * Multi-location keys (`linkHealth` today) probe additionalFields →
 * aCommands → entity flat in that order — whichever the backend chose to
 * populate this frame wins.
 *
 * Bootstrap defaults form the base, so any field absent from the response
 * keeps its compile-time default rather than collapsing to `undefined`.
 * Form-only Primary fields (`teo` / `gsMtrRec` / `aiMtrRec`) have no
 * server slot and intentionally retain their defaults.
 */

export type FormSeed = Record<string, string | string[]>;

export interface FormSeeds {
  primary: FormSeed;
  secondary: FormSeed;
}

export function seedFromResponse(response: SystemExperimentsResponse): FormSeeds {
  return {
    primary: seedPrimary(response),
    secondary: seedSecondary(response),
  };
}

function seedPrimary(response: SystemExperimentsResponse): FormSeed {
  const seed = buildPrimaryCommandsDefaults();
  const standardFields = response.entities[0].mCommands[0].standardFields as unknown as Record<string, string | string[]>;
  for (const field of PRIMARY_COMMANDS_MAIN_FIELDS) {
    overlayIfPresent(seed, standardFields, field.key);
  }
  return seed;
}

function seedSecondary(response: SystemExperimentsResponse): FormSeed {
  const seed = buildSecondaryCommandsDefaults();
  const left = response.entities[0];
  const firstWheel = left.mCommands[0];
  const additionalFields = firstWheel.additionalFields as unknown as Record<string, string | string[]>;
  const aCommands        = left.aCommands              as unknown as Record<string, string | string[]>;
  const entityFlat       = left                         as unknown as Record<string, string | string[]>;

  for (const field of SECONDARY_COMMANDS_8COL_FIELDS) {
    overlayIfPresent(seed, additionalFields, field.key);
  }
  for (const field of SECONDARY_COMMANDS_TLL_TLR_FIELDS) {
    overlayIfPresent(seed, aCommands, field.key);
  }
  for (const field of SECONDARY_COMMANDS_GDL_FIELDS) {
    overlayIfPresent(seed, entityFlat, field.key);
  }
  for (const field of SECONDARY_COMMANDS_MULTI_LOCATION_FIELDS) {
    overlayMultiLocation(seed, field.key, additionalFields, aCommands, entityFlat);
  }

  return seed;
}

function overlayIfPresent(
  seed: FormSeed,
  source: Record<string, string | string[]>,
  key: string,
): void {
  const value = source[key];
  if (value !== undefined && value !== null) {
    seed[key] = value;
  }
}

/** Probes slots in priority order; first defined value wins. */
function overlayMultiLocation(
  seed: FormSeed,
  key: string,
  ...sources: Record<string, string | string[]>[]
): void {
  for (const source of sources) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      seed[key] = value;
      return;
    }
  }
}
