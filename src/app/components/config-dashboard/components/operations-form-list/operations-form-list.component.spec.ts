import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';

import { OperationsFormListComponent } from './operations-form-list.component';
import { OperationsFormListModule } from './operations-form-list.module';
import { DEFAULT_OPERATIONS_VALUE, OperationsValue } from './operations-form-list.models';

describe('OperationsFormListComponent', () => {
  let component: OperationsFormListComponent;
  let fixture: ComponentFixture<OperationsFormListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsFormListModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationsFormListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('writeValue should set all 10 controls', () => {
    const incoming: OperationsValue = {
      opr1: 'a', opr2: 'b', opr3: 'c', opr4: 'd', opr5: 'e',
      opr6: 'f', opr7: 'g', opr8: 'h', opr9: 'i', opr10: 'j',
    };
    component.writeValue(incoming);
    expect(component.form.value).toEqual(incoming);
  });

  it('writeValue(null) should reset to defaults', () => {
    component.writeValue(null);
    expect(component.form.value).toEqual(DEFAULT_OPERATIONS_VALUE);
  });

  it('changing a single control should emit OperationsValue with only that field changed', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);
    component.writeValue({ ...DEFAULT_OPERATIONS_VALUE });

    component.form.controls['opr4'].setValue('option-3');

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.calls.mostRecent().args[0] as OperationsValue;
    expect(emitted.opr4).toBe('option-3');
    expect(emitted.opr1).toBe('option-1');
  });

  it('setDisabledState should disable all 10 dropdowns', () => {
    component.setDisabledState(true);
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect(selects.length).toBe(10);
    selects.forEach((de) => {
      expect((de.componentInstance as MatSelect).disabled).toBe(true);
    });
  });

  it('should render 10 rows with act 1 through act 10 labels', () => {
    const labels = fixture.nativeElement.querySelectorAll('.app-dropdown-label');
    expect(labels.length).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(labels[i].textContent?.trim()).toBe(`act ${i + 1}`);
    }
  });
});
