import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { DropdownOption } from '../components/app-dropdown/app-dropdown.models';
import { BOARD_IDS } from '../features/engine-sim/shared/board-ids';
import { COL_IDS } from '../features/engine-sim/shared/column-ids';
import { CmdSelection, GridColumn, GridRow } from '../features/engine-sim/shared/engine-sim.models';
import { PRIMARY_COMMANDS_COLUMNS } from '../features/engine-sim/boards/primary-commands/primary-commands.columns';
import { SECONDARY_COMMANDS_COLUMNS } from '../features/engine-sim/boards/secondary-commands/secondary-commands.columns';

@Component({
  selector: 'app-demo-page',
  templateUrl: './demo-page.component.html',
  styleUrls: ['./demo-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoPageComponent {
  readonly fruits: DropdownOption[] = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' },
    { value: 'date', label: 'Date' },
  ];

  readonly tags: DropdownOption[] = [
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
    { value: 'yellow', label: 'Yellow' },
  ];

  standaloneSingle = 'banana';
  ngModelSingle = 'apple';
  standaloneMulti: string[] = ['red', 'blue'];

  readonly form = new FormGroup({
    fruit: new FormControl('cherry'),
    tags: new FormControl(['green']),
  });

  resetForm(): void {
    this.form.reset({ fruit: 'cherry', tags: ['green'] });
  }

  toggleFormDisabled(): void {
    this.form.disabled ? this.form.enable() : this.form.disable();
  }

  // ---------------------------------------------------------------------------
  // Engine Sim — Phase 3 dumb-component previews
  // ---------------------------------------------------------------------------

  readonly boardIds = BOARD_IDS;

  // CMD section
  cmdSelection: CmdSelection = { sides: [], wheels: [] };
  cmdDisabled = false;

  onCmdSelectionChange(selection: CmdSelection): void {
    this.cmdSelection = selection;
  }

  // Footer
  footerDisabled = false;
  footerEvents: string[] = [];

  onFooterEvent(action: 'defaults' | 'cancel' | 'apply'): void {
    this.footerEvents = [`${new Date().toLocaleTimeString()} → ${action}`, ...this.footerEvents].slice(0, 5);
  }

  // Status grid — 8-col preview using PRIMARY_COMMANDS_COLUMNS
  readonly primaryGridColumns: GridColumn[] = PRIMARY_COMMANDS_COLUMNS;
  readonly primaryGridRows: GridRow[] = [
    {
      fieldKey: 'tff',
      label: 'TFF',
      values: {
        [COL_IDS.left[0]]: 'NA',  [COL_IDS.left[1]]: 'LA',  [COL_IDS.left[2]]: 'NA',  [COL_IDS.left[3]]: 'DOM',
        [COL_IDS.right[0]]: 'DOM', [COL_IDS.right[1]]: 'NA', [COL_IDS.right[2]]: 'LA',  [COL_IDS.right[3]]: 'NA',
      },
    },
    {
      fieldKey: 'mlmTransmit',
      label: 'MLM transmit',
      values: {
        [COL_IDS.left[0]]: 'Y',  [COL_IDS.left[1]]: 'N',  [COL_IDS.left[2]]: 'Y',  [COL_IDS.left[3]]: 'Y',
        [COL_IDS.right[0]]: 'N', [COL_IDS.right[1]]: 'Y', [COL_IDS.right[2]]: 'N',  [COL_IDS.right[3]]: 'Y',
      },
    },
    {
      fieldKey: 'forceTtl',
      label: 'Force TTL',
      values: {
        [COL_IDS.left[0]]: 'NRM', [COL_IDS.left[1]]: 'FRC', [COL_IDS.left[2]]: 'NRM', [COL_IDS.left[3]]: 'NRM',
        [COL_IDS.right[0]]: 'NRM', [COL_IDS.right[1]]: 'NRM', [COL_IDS.right[2]]: 'FRC', [COL_IDS.right[3]]: 'NRM',
      },
    },
  ];

  // Form-column stub for the EngineSimBoardComponent preview. Enough rows to
  // overflow the body so the scroll behavior (and the sticky cmd / footer)
  // is observable. Real form components arrive in Phase 5.
  readonly boardFormStubRows: { label: string; value: string }[] = [
    { label: 'TFF',                  value: 'NA' },
    { label: 'MLM transmit',         value: 'No' },
    { label: 'Video rec',            value: 'Internal' },
    { label: 'Video Rec Type',       value: 'No' },
    { label: 'Mtr Rec',              value: 'No' },
    { label: 'PWR On/Off',           value: 'On' },
    { label: 'Force',                value: 'Normal' },
    { label: 'Wheel Critical Fail',  value: 'No' },
    { label: 'Wheel Warning Fail',   value: 'Normal' },
    { label: 'TL Critical Fail',     value: 'No' },
    { label: 'Master TL Fail',       value: 'On' },
    { label: 'GDL Fail',             value: 'Normal' },
    { label: 'Ant Transmit Pwr',     value: 'Auto' },
    { label: 'UUU Ant Select',       value: 'Normal' },
  ];

  // Status grid — 11-col preview using SECONDARY_COMMANDS_COLUMNS
  readonly secondaryGridColumns: GridColumn[] = SECONDARY_COMMANDS_COLUMNS;
  readonly secondaryGridRows: GridRow[] = [
    {
      fieldKey: 'whlCriticalFail',
      label: 'Wheel Critical Fail',
      values: {
        [COL_IDS.left[0]]: 'N', [COL_IDS.left[1]]: 'Y', [COL_IDS.left[2]]: 'N', [COL_IDS.left[3]]: 'N',
        [COL_IDS.right[0]]: 'N', [COL_IDS.right[1]]: 'N', [COL_IDS.right[2]]: 'Y', [COL_IDS.right[3]]: 'N',
      },
    },
    {
      fieldKey: 'tlCriticalFail',
      label: 'TL Critical Fail',
      values: { [COL_IDS.tll]: 'N', [COL_IDS.tlr]: 'Y' },
    },
    {
      fieldKey: 'antTransmitPwr',
      label: 'Ant Transmit Pwr',
      values: { [COL_IDS.gdl]: 'ON' },
    },
  ];
}
