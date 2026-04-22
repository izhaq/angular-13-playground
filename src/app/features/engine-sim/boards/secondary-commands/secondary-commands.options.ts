import { ENGINE_SIM_LABELS as L } from '../../shared/engine-sim.labels';
import { LabeledOption } from '../../shared/engine-sim.models';
import {
  AUTO_MANUAL,
  NORMAL_FORCED,
  ON_OFF,
  YES_NO,
} from '../../shared/option-values';

/**
 * Option sets used by Secondary Commands fields only.
 * `value` is sourced from canonical maps in shared/option-values.ts.
 * `abbr` is board-local (the same value renders differently per board)
 * and required by `LabeledOption` so the grid cell is never blank.
 */

export const YES_NO_OPTIONS: LabeledOption[] = [
  { value: YES_NO.No,  label: L.no,  abbr: 'NO' },
  { value: YES_NO.Yes, label: L.yes, abbr: 'YES' },
];

export const NORMAL_FORCED_OPTIONS: LabeledOption[] = [
  { value: NORMAL_FORCED.Normal, label: L.normal, abbr: 'NRML' },
  { value: NORMAL_FORCED.Forced, label: L.forced, abbr: 'FRC' },
];

export const ON_OFF_OPTIONS: LabeledOption[] = [
  { value: ON_OFF.On,  label: L.on,  abbr: 'ON' },
  { value: ON_OFF.Off, label: L.off, abbr: 'OFF' },
];

export const AUTO_MANUAL_OPTIONS: LabeledOption[] = [
  { value: AUTO_MANUAL.Auto,   label: L.auto,   abbr: 'ATU' },
  { value: AUTO_MANUAL.Manual, label: L.manual, abbr: 'MNL' },
];
