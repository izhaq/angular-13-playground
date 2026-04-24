import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import {
  AppDropdownCvaModule,
  AppDropdownModule,
  AppMultiDropdownModule,
} from '../../../_external/ui-primitives';
import { BOARD_IDS } from '../../../shared/ids';
import { buildFormGroup } from '../../build-form-group';
import { SECONDARY_COMMANDS_ALL_FIELDS } from '../secondary-commands.fields';
import { SecondaryCommandsFormComponent } from './secondary-commands-form.component';

@Component({
  template: `
    <system-experiments-secondary-commands-form [formGroup]="formGroup">
    </system-experiments-secondary-commands-form>
  `,
})
class HostComponent {
  formGroup: FormGroup = buildFormGroup(SECONDARY_COMMANDS_ALL_FIELDS);
}

describe('SecondaryCommandsFormComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SecondaryCommandsFormComponent, HostComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        AppDropdownModule,
        AppMultiDropdownModule,
        AppDropdownCvaModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Test-id prefix mirrors the component's `'form-' + boardId + '-' + fieldKey`
  // composition. Read from BOARD_IDS so a rename of the board id surfaces as
  // a normal type/lookup error here instead of silently desyncing the spec.
  const fieldIdPrefix = `form-${BOARD_IDS.secondary}-`;

  function dropdownByTestId(fieldKey: string): HTMLElement | null {
    const el = fixture.debugElement.query(
      By.css(`[data-test-id="${fieldIdPrefix}${fieldKey}"]`),
    );
    return el ? (el.nativeElement as HTMLElement) : null;
  }

  it('renders one dropdown per field across all 14 secondary fields', () => {
    for (const field of SECONDARY_COMMANDS_ALL_FIELDS) {
      expect(dropdownByTestId(field.key))
        .withContext(`expected dropdown for "${field.key}"`)
        .not.toBeNull();
    }

    const all = fixture.debugElement.queryAll(By.css(`[data-test-id^="${fieldIdPrefix}"]`));
    expect(all.length).toBe(SECONDARY_COMMANDS_ALL_FIELDS.length);
  });

  it('has no sub-section header (flat list, no grouping)', () => {
    expect(
      fixture.debugElement.query(By.css(`[data-test-id^="section-${BOARD_IDS.secondary}-"]`)),
    ).toBeNull();
  });

  it('renders multi-select fields as app-multi-dropdown and single as app-dropdown', () => {
    for (const field of SECONDARY_COMMANDS_ALL_FIELDS) {
      const id = `${fieldIdPrefix}${field.key}`;
      const matchingHost = fixture.debugElement.query(
        By.css(
          field.type === 'multi'
            ? `app-multi-dropdown [data-test-id="${id}"]`
            : `app-dropdown [data-test-id="${id}"]`,
        ),
      );
      expect(matchingHost)
        .withContext(`"${field.key}" should render as ${field.type}-select`)
        .not.toBeNull();
    }
  });

  it('seeds each control to the field default', () => {
    for (const field of SECONDARY_COMMANDS_ALL_FIELDS) {
      expect(host.formGroup.get(field.key)?.value).toEqual(field.defaultValue);
    }
  });

  it('reflects FormGroup.disable() — every control follows the group state', () => {
    // The shell drives test/live mode by calling formGroup.disable()/enable()
    // on the seed FormGroup; the component is just a renderer. This test
    // exercises that contract end-to-end (no [disabled] input layer).
    host.formGroup.disable();
    fixture.detectChanges();

    expect(host.formGroup.disabled).toBe(true);
    for (const field of SECONDARY_COMMANDS_ALL_FIELDS) {
      expect(host.formGroup.get(field.key)?.disabled)
        .withContext(`"${field.key}" should follow the group's disabled state`)
        .toBe(true);
    }
  });

  it('re-enables every control when FormGroup.enable() is called', () => {
    host.formGroup.disable();
    fixture.detectChanges();
    host.formGroup.enable();
    fixture.detectChanges();

    expect(host.formGroup.enabled).toBe(true);
    for (const field of SECONDARY_COMMANDS_ALL_FIELDS) {
      expect(host.formGroup.get(field.key)?.enabled).toBe(true);
    }
  });
});
