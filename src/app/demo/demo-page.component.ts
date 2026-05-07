import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { DropdownOption } from '../components/app-dropdown/app-dropdown.models';

interface FlashRow {
  id: number;
  values: { [colId: string]: number };
}

const INITIAL_FLASH_COLS = ['A', 'B', 'C'];

const INITIAL_FLASH_ROWS: ReadonlyArray<FlashRow> = [
  { id: 1, values: { A: 100, B: 200, C: 300 } },
  { id: 2, values: { A: 150, B: 250, C: 350 } },
  { id: 3, values: { A: 175, B: 275, C: 375 } },
  { id: 4, values: { A: 199, B: 299, C: 399 } },
];

// Smaller dataset for the "trackBy gotcha" usage demo — kept separate from
// INITIAL_FLASH_ROWS so the usage section's mutations don't visually
// interact with the main side-by-side demo above it.
const INITIAL_USAGE_COLS = ['A', 'B'];
const INITIAL_USAGE_ROWS: ReadonlyArray<FlashRow> = [
  { id: 1, values: { A: 1, B: 2 } },
  { id: 2, values: { A: 3, B: 4 } },
];
import { buildFormGroup } from '../features/system-experiments/boards/build-form-group';
import {
  PRIMARY_COMMANDS_ALL_FIELDS,
  PRIMARY_COMMANDS_CMD_TO_GS_FIELDS,
  PRIMARY_COMMANDS_MAIN_FIELDS,
} from '../features/system-experiments/boards/primary-commands/primary-commands.fields';
import { PRIMARY_COMMANDS_COLUMNS } from '../features/system-experiments/boards/primary-commands/primary-commands.columns';
import { SECONDARY_COMMANDS_ALL_FIELDS } from '../features/system-experiments/boards/secondary-commands/secondary-commands.fields';
import { SECONDARY_COMMANDS_COLUMNS } from '../features/system-experiments/boards/secondary-commands/secondary-commands.columns';
import { BOARD_IDS, COL_IDS } from '../features/system-experiments/shared/ids';
import { CmdSelection, FieldConfig, GridColumn, GridRow } from '../features/system-experiments/shared/models';

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
  // System Experiments — Phase 3 dumb-component previews
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

  // ---------------------------------------------------------------------------
  // System Experiments — Phase 5 form components
  // ---------------------------------------------------------------------------
  //
  // Each form gets its own FormGroup built directly from the board's
  // sibling fields module via the shared `buildFormGroup` primitive —
  // exactly what the per-board services do in production (see plan §15).
  // Test-mode toggling drives `formGroup.disable()` / `.enable()`
  // directly — the form components themselves don't expose a
  // `[disabled]` input, the FormGroup is the single source of truth
  // for that bit of state.

  readonly primaryFormGroup: FormGroup = buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS);
  readonly secondaryFormGroup: FormGroup = buildFormGroup(SECONDARY_COMMANDS_ALL_FIELDS);

  readonly primaryGridFields: FieldConfig[]     = PRIMARY_COMMANDS_MAIN_FIELDS;
  readonly primaryFormOnlyFields: FieldConfig[] = PRIMARY_COMMANDS_CMD_TO_GS_FIELDS;
  readonly secondaryGridFields: FieldConfig[]     = SECONDARY_COMMANDS_ALL_FIELDS;
  readonly secondaryFormOnlyFields: FieldConfig[] = [];

  togglePrimaryFormDisabled(): void {
    this.primaryFormGroup.disabled
      ? this.primaryFormGroup.enable()
      : this.primaryFormGroup.disable();
  }

  toggleSecondaryFormDisabled(): void {
    this.secondaryFormGroup.disabled
      ? this.secondaryFormGroup.enable()
      : this.secondaryFormGroup.disable();
  }

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

  // ---------------------------------------------------------------------------
  // Cell Flash on Change — Versions A & B side-by-side
  // ---------------------------------------------------------------------------
  //
  // Two grids on the same data model so a single mutation drives both.
  // Critical demo: "Re-broadcast same values" must NOT flash either grid
  // (proves the directive's value-vs-reference comparison).
  //
  // See: specs/cell-flash-on-change/spec.md and tasks.md Task 4.1.

  flashCols: string[] = [...INITIAL_FLASH_COLS];
  flashRows: FlashRow[] = this.cloneFlashRows(INITIAL_FLASH_ROWS);
  flashDuration = 10_000;

  trackByFlashRowId = (_: number, row: FlashRow) => row.id;
  trackByFlashCol = (_: number, col: string) => col;

  mutateOneCell(): void {
    this.flashRows = this.mutateOneRandomCellIn(this.flashRows, this.flashCols);
  }

  mutateAllCells(): void {
    this.flashRows = this.flashRows.map((row) => ({
      ...row,
      values: this.flashCols.reduce<{ [colId: string]: number }>((acc, col) => {
        acc[col] = this.randomCellValue();
        return acc;
      }, {}),
    }));
  }

  // Re-emit the SAME primitive values. Angular's input-change check uses ===
  // on the evaluated expression (a primitive number); === says "no change",
  // so ngOnChanges never fires on either directive — proving the
  // value-vs-reference distinction.
  rebroadcastSameValues(): void {
    this.flashRows = this.flashRows.map((row) => ({
      ...row,
      values: { ...row.values },
    }));
  }

  resetFlashTable(): void {
    this.flashCols = [...INITIAL_FLASH_COLS];
    this.flashRows = this.cloneFlashRows(INITIAL_FLASH_ROWS);
  }

  // 100 rows × 10 cols = 1000 cells — perf stress for the "60 fps with 1k
  // cells" claim. Open Chrome DevTools Performance tab while clicking
  // "Mutate all cells" with this loaded to verify no main-thread long tasks.
  spawnThousandCells(): void {
    this.flashCols = Array.from({ length: 10 }, (_, i) => `C${i + 1}`);
    this.flashRows = Array.from({ length: 100 }, (_, rowIdx) => ({
      id: rowIdx + 1,
      values: this.flashCols.reduce<{ [colId: string]: number }>((acc, col) => {
        acc[col] = this.randomCellValue();
        return acc;
      }, {}),
    }));
  }

  // ---------------------------------------------------------------------------
  // Cell Flash on Change — Usage guide (trackBy gotcha live demo)
  // ---------------------------------------------------------------------------
  //
  // Two tables on the same `usageRows` data — one with trackBy, one without.
  // A single mutation hits both, but only the trackBy table flashes (the
  // other rebuilds every <tr>, giving each new directive a "first emission"
  // pass). Visceral proof of the requirement documented in the same section.

  usageCols: string[] = [...INITIAL_USAGE_COLS];
  usageRows: FlashRow[] = this.cloneFlashRows(INITIAL_USAGE_ROWS);

  trackByUsageRowId = (_: number, row: FlashRow) => row.id;
  trackByUsageCol = (_: number, col: string) => col;

  // Bound as a TS string (not inlined in the template) because Angular's
  // template parser decodes HTML entities before checking for `{{`, so any
  // attempt to escape interpolation braces inline (`&#123;&#123;` etc.)
  // gets resolved back to `{{` and the parser tries to evaluate it. A bound
  // string is just text content — the browser's text rendering takes care
  // of escaping `<` / `>` automatically.
  readonly usageSnippet = [
    `<td *ngFor="let col of cols; trackBy: trackByCol"`,
    `    [appFlashOnChangeCss]="row.values[col]"`,
    `    [flashDurationMs]="2000">`,
    `  {{ row.values[col] }}`,
    `</td>`,
  ].join('\n');

  mutateOneUsageCell(): void {
    this.usageRows = this.mutateOneRandomCellIn(this.usageRows, this.usageCols);
  }

  resetUsageTable(): void {
    this.usageRows = this.cloneFlashRows(INITIAL_USAGE_ROWS);
  }

  // Shared mutation helper used by both the main demo and the usage demo.
  // Picks a random (row, col), returns a NEW array with the row replaced
  // (immutable update — required for OnPush + the cell directives' Object.is
  // check to register "value changed").
  private mutateOneRandomCellIn(rows: FlashRow[], cols: string[]): FlashRow[] {
    const rowIdx = Math.floor(Math.random() * rows.length);
    const colIdx = Math.floor(Math.random() * cols.length);
    const col = cols[colIdx];
    return rows.map((row, i) =>
      i === rowIdx
        ? { ...row, values: { ...row.values, [col]: this.randomCellValue() } }
        : row
    );
  }

  private cloneFlashRows(rows: ReadonlyArray<FlashRow>): FlashRow[] {
    return rows.map((r) => ({ ...r, values: { ...r.values } }));
  }

  private randomCellValue(): number {
    return Math.floor(Math.random() * 1000);
  }
}
