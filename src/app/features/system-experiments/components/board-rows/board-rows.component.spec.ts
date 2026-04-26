import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

import {
  AppDropdownCvaModule,
  AppDropdownModule,
  AppMultiDropdownModule,
} from '../../_external/ui-primitives';
import { BoardRowsComponent } from './board-rows.component';
import { BOARD_IDS, COL_IDS } from '../../shared/ids';
import { FieldConfig, GridColumn, GridRow } from '../../shared/models';

/**
 * BoardRowsComponent owns the unified form + grid layout (Option B).
 * The contract this spec pins:
 *   - one CSS Grid container with `--data-col-count` set to columns.length
 *   - column-header strip (corner cells + one header per column)
 *   - per `gridFields[i]`: label, control bound by `formControlName`,
 *     and one data cell per column; cell text comes from `rows` keyed
 *     by `fieldKey`
 *   - a divider + spacer pair iff `formOnlyFields.length > 0`
 *   - per `formOnlyFields[i]`: label + control + a row-end spacer (no
 *     data cells) so auto-flow snaps to a new row
 *   - test ids match the legacy contract so existing E2E selectors keep
 *     working: `grid-header-{boardId}-{colId}`, `grid-label-{boardId}-{key}`,
 *     `form-{boardId}-{key}`, `grid-{boardId}-{key}-{colId}`,
 *     `section-{boardId}-cmd-to-gs`
 */
describe('BoardRowsComponent', () => {
  let fixture: ComponentFixture<BoardRowsComponent>;
  let component: BoardRowsComponent;

  const columns: GridColumn[] = [
    { id: COL_IDS.left[0],  label: 'L1' },
    { id: COL_IDS.left[1],  label: 'L2' },
    { id: COL_IDS.right[0], label: 'R1' },
  ];

  const sampleOptions = [
    { value: 'a', label: 'Alpha', abbr: 'A' },
    { value: 'b', label: 'Bravo', abbr: 'B' },
  ];

  const gridFields: FieldConfig[] = [
    { key: 'foo', label: 'Foo', type: 'single', defaultValue: 'a', options: sampleOptions },
    { key: 'bar', label: 'Bar', type: 'multi',  defaultValue: [],  options: sampleOptions },
  ];

  const formOnlyFields: FieldConfig[] = [
    { key: 'baz', label: 'Baz', type: 'single', defaultValue: 'a', options: sampleOptions },
  ];

  const rows: GridRow[] = [
    {
      fieldKey: 'foo',
      label: 'Foo',
      values: { [columns[0].id]: 'A', [columns[1].id]: 'B', [columns[2].id]: 'A' },
    },
    {
      fieldKey: 'bar',
      label: 'Bar',
      values: { [columns[0].id]: 'A,B', [columns[1].id]: '', [columns[2].id]: 'B' },
    },
  ];

  function buildFormGroup(allFields: FieldConfig[]): FormGroup {
    const controls: { [key: string]: FormControl } = {};
    allFields.forEach((f) => {
      controls[f.key] = new FormControl(f.defaultValue);
    });
    return new FormGroup(controls);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatTooltipModule,
        AppDropdownModule,
        AppMultiDropdownModule,
        AppDropdownCvaModule,
      ],
      declarations: [BoardRowsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BoardRowsComponent);
    component = fixture.componentInstance;
    component.boardId = BOARD_IDS.primary;
    component.formGroup = buildFormGroup([...gridFields, ...formOnlyFields]);
    component.gridFields = gridFields;
    component.formOnlyFields = formOnlyFields;
    component.columns = columns;
    component.rows = rows;
    fixture.detectChanges();
  });

  // ---------------------------------------------------------------------------
  // Container
  // ---------------------------------------------------------------------------

  it('renders one grid container with the data-column count exposed as a CSS var', () => {
    const grid = fixture.debugElement.query(By.css('.board-rows'));
    expect(grid).toBeTruthy();
    expect(grid.nativeElement.style.getPropertyValue('--data-col-count'))
      .toBe(String(columns.length));
  });

  // ---------------------------------------------------------------------------
  // Column headers
  // ---------------------------------------------------------------------------

  it('renders one header cell per column, with the legacy test id', () => {
    columns.forEach((col) => {
      const header = fixture.debugElement.query(
        By.css(`[data-test-id="grid-header-${component.boardId}-${col.id}"]`),
      );
      expect(header).withContext(`expected header for ${col.id}`).not.toBeNull();
      expect(header.nativeElement.textContent.trim()).toBe(col.label);
    });
  });

  // ---------------------------------------------------------------------------
  // In-grid rows
  // ---------------------------------------------------------------------------

  it('renders one label + form control + N data cells per gridField', () => {
    gridFields.forEach((field) => {
      const label = fixture.debugElement.query(
        By.css(`[data-test-id="grid-label-${component.boardId}-${field.key}"]`),
      );
      expect(label).withContext(`label for ${field.key}`).not.toBeNull();
      expect(label.nativeElement.textContent.trim()).toBe(field.label);

      const control = fixture.debugElement.query(
        By.css(`[data-test-id="form-${component.boardId}-${field.key}"]`),
      );
      expect(control).withContext(`control for ${field.key}`).not.toBeNull();

      columns.forEach((col) => {
        const cell = fixture.debugElement.query(
          By.css(`[data-test-id="grid-${component.boardId}-${field.key}-${col.id}"]`),
        );
        expect(cell).withContext(`cell ${field.key}/${col.id}`).not.toBeNull();
      });
    });
  });

  it('fills data cells from rows keyed by fieldKey', () => {
    const cell = fixture.debugElement.query(
      By.css(`[data-test-id="grid-${component.boardId}-bar-${columns[0].id}"]`),
    );
    expect(cell.nativeElement.textContent.trim()).toBe('A,B');
  });

  it('exposes the cell value as a hover tooltip (matTooltip on the text span)', () => {
    const span = fixture.debugElement.query(
      By.css(
        `[data-test-id="grid-${component.boardId}-bar-${columns[0].id}"] .board-rows__data-cell-text`,
      ),
    );
    expect(span).withContext('expected text span inside data cell').not.toBeNull();
    expect(span.attributes['ng-reflect-message']).toBe('A,B');
  });

  it('column hover toggles --col-hovered on every cell in that column', () => {
    const colId = columns[1].id;
    const targetCell = fixture.debugElement.query(
      By.css(`[data-test-id="grid-${component.boardId}-foo-${colId}"]`),
    );

    targetCell.triggerEventHandler('mouseenter', null);
    fixture.detectChanges();

    gridFields.forEach((field) => {
      const cell = fixture.debugElement.query(
        By.css(`[data-test-id="grid-${component.boardId}-${field.key}-${colId}"]`),
      );
      expect(cell.nativeElement.classList).toContain('board-rows__data-cell--col-hovered');
    });
  });

  it('clicking a cell flips its --selected class on (and only that one)', () => {
    const target = fixture.debugElement.query(
      By.css(`[data-test-id="grid-${component.boardId}-foo-${columns[0].id}"]`),
    );
    target.triggerEventHandler('click', null);
    fixture.detectChanges();

    expect(target.nativeElement.classList).toContain('board-rows__data-cell--selected');

    const sibling = fixture.debugElement.query(
      By.css(`[data-test-id="grid-${component.boardId}-bar-${columns[0].id}"]`),
    );
    expect(sibling.nativeElement.classList).not.toContain('board-rows__data-cell--selected');
  });

  // ---------------------------------------------------------------------------
  // Form-only section (Cmd-to-GS for Primary)
  // ---------------------------------------------------------------------------

  it('renders the divider + spacer iff there are form-only fields', () => {
    const divider = fixture.debugElement.query(
      By.css(`hr[data-test-id="section-${component.boardId}-cmd-to-gs"]`),
    );
    expect(divider).not.toBeNull();
    expect(fixture.debugElement.query(By.css('.board-rows__divider-spacer'))).not.toBeNull();
  });

  it('renders form-only fields as label + control + spacer (no data cells)', () => {
    formOnlyFields.forEach((field) => {
      const label = fixture.debugElement.query(
        By.css(`[data-test-id="grid-label-${component.boardId}-${field.key}"]`),
      );
      const control = fixture.debugElement.query(
        By.css(`[data-test-id="form-${component.boardId}-${field.key}"]`),
      );
      expect(label).not.toBeNull();
      expect(control).not.toBeNull();

      // No data cells should exist for this fieldKey.
      columns.forEach((col) => {
        const cell = fixture.debugElement.query(
          By.css(`[data-test-id="grid-${component.boardId}-${field.key}-${col.id}"]`),
        );
        expect(cell).withContext(`form-only field ${field.key} should NOT have data cells`).toBeNull();
      });
    });
  });

  it('omits the divider when formOnlyFields is empty', () => {
    component.formOnlyFields = [];
    fixture.detectChanges();
    expect(fixture.debugElement.query(
      By.css(`hr[data-test-id="section-${component.boardId}-cmd-to-gs"]`),
    )).toBeNull();
  });
});
