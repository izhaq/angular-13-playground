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
import {
  PRIMARY_COMMANDS_ALL_FIELDS,
  PRIMARY_COMMANDS_CMD_TO_GS_FIELDS,
  PRIMARY_COMMANDS_MAIN_FIELDS,
} from '../primary-commands.fields';
import { PrimaryCommandsFormComponent } from './primary-commands-form.component';

/**
 * Host wrapper so inputs flow through Angular's binding system. Required
 * because the child uses OnPush — direct property mutation would not
 * dirty its view.
 *
 * The host materialises the FormGroup the same way the per-board
 * service does in production — `buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS)`
 * — so any drift between the form's declared field shape and what the
 * service builds surfaces as a real test failure here.
 */
@Component({
  template: `
    <system-experiments-primary-commands-form [formGroup]="formGroup">
    </system-experiments-primary-commands-form>
  `,
})
class HostComponent {
  formGroup: FormGroup = buildFormGroup(PRIMARY_COMMANDS_ALL_FIELDS);
}

describe('PrimaryCommandsFormComponent', () => {

  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrimaryCommandsFormComponent, HostComponent],
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
  const fieldIdPrefix = `form-${BOARD_IDS.primary}-`;

  function dropdownByTestId(fieldKey: string): HTMLElement | null {
    const el = fixture.debugElement.query(
      By.css(`[data-test-id="${fieldIdPrefix}${fieldKey}"]`),
    );
    return el ? (el.nativeElement as HTMLElement) : null;
  }

  it('renders one dropdown per field across main + Cmd-to-GS sections', () => {
    for (const field of PRIMARY_COMMANDS_ALL_FIELDS) {
      expect(dropdownByTestId(field.key))
        .withContext(`expected dropdown for "${field.key}"`)
        .not.toBeNull();
    }

    // Sanity: total dropdowns equal field count (no duplicates, no extras).
    const all = fixture.debugElement.queryAll(By.css(`[data-test-id^="${fieldIdPrefix}"]`));
    expect(all.length).toBe(PRIMARY_COMMANDS_ALL_FIELDS.length);
  });

  it('renders the "Cmd to GS" sub-section divider above its three fields', () => {
    // Section markers use the `section-{boardId}-{name}` pattern so they
    // never collide with the `form-{boardId}-{fieldKey}` field test ids.
    const divider = fixture.debugElement.query(
      By.css(`hr[data-test-id="section-${BOARD_IDS.primary}-cmd-to-gs"]`),
    );
    expect(divider).withContext('expected Cmd-to-GS section divider').not.toBeNull();

    for (const field of PRIMARY_COMMANDS_CMD_TO_GS_FIELDS) {
      expect(dropdownByTestId(field.key)).not.toBeNull();
    }
  });

  it('renders multi-select fields as app-multi-dropdown and single as app-dropdown', () => {
    for (const field of PRIMARY_COMMANDS_ALL_FIELDS) {
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

  it('seeds each control to the field default and reflects FormGroup writes', () => {
    for (const field of PRIMARY_COMMANDS_MAIN_FIELDS) {
      expect(host.formGroup.get(field.key)?.value).toEqual(field.defaultValue);
    }
  });

  it('reflects FormGroup.disable() — every control follows the group state', () => {
    // The shell drives test/live mode by calling formGroup.disable()/enable()
    // directly on the seed FormGroup; the component is just a renderer. This
    // test exercises that contract end-to-end (no [disabled] input layer).
    host.formGroup.disable();
    fixture.detectChanges();

    expect(host.formGroup.disabled).toBe(true);
    for (const field of PRIMARY_COMMANDS_ALL_FIELDS) {
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
    for (const field of PRIMARY_COMMANDS_ALL_FIELDS) {
      expect(host.formGroup.get(field.key)?.enabled).toBe(true);
    }
  });
});
