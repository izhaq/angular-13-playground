/**
 * Canonical option value maps for the System Experiments feature.
 *
 * Centralizes the string values that flow between forms, grid cells, and the
 * backend — these are wire values the API expects, not arbitrary labels.
 *
 * Pattern: `as const` maps with a derived literal-union type. Preferred over
 * `enum` to avoid `const enum` build pitfalls and keep the JS output minimal.
 *
 * Display abbreviations live on `DropdownOption.abbr` in each board's
 * options file because abbreviations differ between boards.
 */

export const YES_NO = { No: 'no', Yes: 'yes' } as const;
export type YesNo = typeof YES_NO[keyof typeof YES_NO];

export const ON_OFF = { On: 'on', Off: 'off' } as const;
export type OnOff = typeof ON_OFF[keyof typeof ON_OFF];

export const NORMAL_FORCED = { Normal: 'normal', Forced: 'forced' } as const;
export type NormalForced = typeof NORMAL_FORCED[keyof typeof NORMAL_FORCED];

export const INT_EXT = { Internal: 'internal', External: 'external' } as const;
export type IntExt = typeof INT_EXT[keyof typeof INT_EXT];

export const TFF = {
  NotActive:   'not_active',
  LightActive: 'light_active',
  Dominate:    'dominate',
} as const;
export type Tff = typeof TFF[keyof typeof TFF];

export const VIDEO_REC_TYPE = {
  No:       'no',
  InfraRed: 'ir',
  K4:       '4k',
  Hdr:      'hdr',
} as const;
export type VideoRecType = typeof VIDEO_REC_TYPE[keyof typeof VIDEO_REC_TYPE];

export const AUTO_MANUAL = { Auto: 'auto', Manual: 'manual' } as const;
export type AutoManual = typeof AUTO_MANUAL[keyof typeof AUTO_MANUAL];

export const SIDE = { Left: 'left', Right: 'right' } as const;
export type Side = typeof SIDE[keyof typeof SIDE];

export const WHEEL = { W1: '1', W2: '2', W3: '3', W4: '4' } as const;
export type Wheel = typeof WHEEL[keyof typeof WHEEL];
