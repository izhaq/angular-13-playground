import { DropdownOption } from '../../_external/ui-primitives';
import { SYSTEM_EXPERIMENTS_LABELS as L } from '../../shared/labels';
import { CmdSelection } from '../../shared/models';
import { Side, SIDE, Wheel, WHEEL } from '../../shared/option-values';

/** Truly shared between both boards (the Cmd. section is identical). */

export const CMD_SIDE_OPTIONS: DropdownOption[] = [
  { value: SIDE.Left,  label: L.sideLeft },
  { value: SIDE.Right, label: L.sideRight },
];

export const CMD_WHEEL_OPTIONS: DropdownOption[] = [
  { value: WHEEL.W1, label: '1' },
  { value: WHEEL.W2, label: '2' },
  { value: WHEEL.W3, label: '3' },
  { value: WHEEL.W4, label: '4' },
];

/**
 * "Everything checked" — the post-Default selection. Derived from the
 * options arrays so adding a side/wheel later automatically updates this
 * without a parallel edit somewhere else.
 */
export const CMD_ALL_SELECTED: CmdSelection = {
  sides:  CMD_SIDE_OPTIONS.map((o)  => o.value as Side),
  wheels: CMD_WHEEL_OPTIONS.map((o) => o.value as Wheel),
};
