import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';

import { RareOperationsListComponent } from './rare-operations-list.component';
import { RareOperationsListModule } from './rare-operations-list.module';
import { DEFAULT_RARE_OPERATIONS, RARE_OPERATIONS_FIELDS, RareOperationsModel } from './rare-operations-list.models';

describe('RareOperationsListComponent', () => {
  let component: RareOperationsListComponent;
  let fixture: ComponentFixture<RareOperationsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RareOperationsListModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RareOperationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with DEFAULT_RARE_OPERATIONS', () => {
    expect(component.value).toEqual(DEFAULT_RARE_OPERATIONS);
  });

  it('setting value input should update the component', () => {
    const incoming: RareOperationsModel = {
      absCalibration: 'yes', tractionDiag: 'yes', steeringAlign: 'yes',
      brakeBleed: 'yes', suspReset: 'yes', eepromFlash: 'yes',
      canBusLog: 'yes', tirePressInit: 'yes', fuelMapSwitch: 'yes',
      coolantPurge: 'yes',
    };
    component.value = incoming;
    expect(component.value).toEqual(incoming);
  });

  it('onControlChanged should update a key and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { ...DEFAULT_RARE_OPERATIONS };

    component.onControlChanged('brakeBleed', 'yes');

    expect(component.value.brakeBleed).toBe('yes');
    expect(spy).toHaveBeenCalledTimes(1);
    const emitted = spy.calls.mostRecent().args[0] as RareOperationsModel;
    expect(emitted.brakeBleed).toBe('yes');
  });

  it('disabled input should propagate to all 10 dropdowns', () => {
    component.disabled = true;
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(10);
    selects.forEach((de) => {
      expect((de.componentInstance as MatSelect).disabled).toBe(true);
    });
  });

  it('should render 10 rows with correct labels', () => {
    const labels = fixture.nativeElement.querySelectorAll('.app-dropdown-label');
    expect(labels.length).toBe(10);
    const expectedLabels = RARE_OPERATIONS_FIELDS.map(f => f.label);
    for (let i = 0; i < 10; i++) {
      expect(labels[i].textContent?.trim()).toBe(expectedLabels[i]);
    }
  });

  it('all dropdowns should be single-select', () => {
    const selects = fixture.debugElement.queryAll(By.directive(MatSelect));
    expect(selects.length).toBe(10);
    selects.forEach((de) => {
      expect((de.componentInstance as MatSelect).multiple).toBeFalsy();
    });
  });
});
