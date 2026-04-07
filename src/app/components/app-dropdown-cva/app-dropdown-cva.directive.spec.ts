import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';

import { AppDropdownComponent } from '../app-dropdown/app-dropdown.component';
import { AppMultiDropdownComponent } from '../app-multi-dropdown/app-multi-dropdown.component';
import { AppDropdownCvaDirective } from './app-dropdown-cva.directive';
import { DropdownOption } from '../app-dropdown/app-dropdown.models';

const TEST_OPTIONS: DropdownOption[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

@Component({
  template: `
    <app-dropdown
      [formControl]="ctrl"
      [options]="options"
      label="Single">
    </app-dropdown>
  `,
})
class SingleHostComponent {
  ctrl = new FormControl('');
  options = TEST_OPTIONS;
}

@Component({
  template: `
    <app-multi-dropdown
      [formControl]="ctrl"
      [options]="options"
      label="Multi">
    </app-multi-dropdown>
  `,
})
class MultiHostComponent {
  ctrl = new FormControl([]);
  options = TEST_OPTIONS;
}

describe('AppDropdownCvaDirective', () => {
  describe('with single-select host', () => {
    let fixture: ComponentFixture<SingleHostComponent>;
    let host: SingleHostComponent;
    let dropdown: AppDropdownComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [
          SingleHostComponent,
          AppDropdownComponent,
          AppDropdownCvaDirective,
        ],
        imports: [
          CommonModule,
          ReactiveFormsModule,
          MatSelectModule,
          MatFormFieldModule,
          NoopAnimationsModule,
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(SingleHostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      dropdown = fixture.debugElement.query(By.directive(AppDropdownComponent))
        .componentInstance as AppDropdownComponent;
    });

    it('should write FormControl value to host', () => {
      host.ctrl.setValue('b');
      fixture.detectChanges();
      expect(dropdown.value).toBe('b');
    });

    it('should propagate host selection change to FormControl', () => {
      dropdown.onSelectionChange({ value: 'c' } as any);
      expect(host.ctrl.value).toBe('c');
    });

    it('should disable host when FormControl is disabled', () => {
      host.ctrl.disable();
      fixture.detectChanges();
      expect(dropdown.disabled).toBe(true);
    });

    it('should enable host when FormControl is re-enabled', () => {
      host.ctrl.disable();
      fixture.detectChanges();
      host.ctrl.enable();
      fixture.detectChanges();
      expect(dropdown.disabled).toBe(false);
    });

    it('should write null as empty string', () => {
      host.ctrl.setValue(null);
      fixture.detectChanges();
      expect(dropdown.value).toBe('');
    });

    it('should mark FormControl as touched after selection', () => {
      expect(host.ctrl.touched).toBe(false);
      dropdown.onSelectionChange({ value: 'a' } as any);
      expect(host.ctrl.touched).toBe(true);
    });
  });

  describe('with multi-select host', () => {
    let fixture: ComponentFixture<MultiHostComponent>;
    let host: MultiHostComponent;
    let multiDropdown: AppMultiDropdownComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        declarations: [
          MultiHostComponent,
          AppMultiDropdownComponent,
          AppDropdownCvaDirective,
        ],
        imports: [
          CommonModule,
          ReactiveFormsModule,
          MatSelectModule,
          MatFormFieldModule,
          NoopAnimationsModule,
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(MultiHostComponent);
      host = fixture.componentInstance;
      fixture.detectChanges();
      multiDropdown = fixture.debugElement.query(By.directive(AppMultiDropdownComponent))
        .componentInstance as AppMultiDropdownComponent;
    });

    it('should write FormControl array value to host', () => {
      host.ctrl.setValue(['a', 'b']);
      fixture.detectChanges();
      expect(multiDropdown.value).toEqual(['a', 'b']);
    });

    it('should propagate host selection change to FormControl', () => {
      multiDropdown.onSelectionChange({ value: ['b', 'c'] } as any);
      expect(host.ctrl.value).toEqual(['b', 'c']);
    });

    it('should disable host when FormControl is disabled', () => {
      host.ctrl.disable();
      fixture.detectChanges();
      expect(multiDropdown.disabled).toBe(true);
    });

    it('should write null as empty array', () => {
      host.ctrl.setValue(null);
      fixture.detectChanges();
      expect(multiDropdown.value).toEqual([]);
    });
  });
});
