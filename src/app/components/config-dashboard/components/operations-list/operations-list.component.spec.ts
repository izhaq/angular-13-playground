import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';

import { OperationsListComponent } from './operations-list.component';
import { OperationsListModule } from './operations-list.module';
import { DEFAULT_VEHICLE_CONTROLS, VEHICLE_CONTROL_FIELDS, VehicleControls } from './operations-list.models';

describe('OperationsListComponent', () => {
  let component: OperationsListComponent;
  let fixture: ComponentFixture<OperationsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperationsListModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with DEFAULT_VEHICLE_CONTROLS', () => {
    expect(component.value).toEqual(DEFAULT_VEHICLE_CONTROLS);
  });

  it('setting value input should update the component', () => {
    const incoming: VehicleControls = {
      terrain: ['gravel', 'sand'], weather: ['rain'], speedLimit: '60', gear: 'd', headlights: 'auto',
      wipers: 'fast', tractionCtrl: 'off', stability: 'esc-off', cruiseCtrl: 'adaptive', brakeAssist: 'full-assist',
    };
    component.value = incoming;
    expect(component.value).toEqual(incoming);
  });

  it('onControlChanged should update a single-select key and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { ...DEFAULT_VEHICLE_CONTROLS };

    component.onControlChanged('gear', 'd');

    expect(component.value.gear).toBe('d');
    expect(spy).toHaveBeenCalledTimes(1);
    const emitted = spy.calls.mostRecent().args[0] as VehicleControls;
    expect(emitted.gear).toBe('d');
  });

  it('onControlChanged should update a multi-select key and emit', () => {
    const spy = spyOn(component.changed, 'emit');
    component.value = { ...DEFAULT_VEHICLE_CONTROLS };

    component.onControlChanged('terrain', ['gravel', 'mud']);

    expect(component.value.terrain).toEqual(['gravel', 'mud']);
    expect(spy).toHaveBeenCalledTimes(1);
    const emitted = spy.calls.mostRecent().args[0] as VehicleControls;
    expect(emitted.terrain).toEqual(['gravel', 'mud']);
  });

  it('disabled input should propagate to all 10 dropdowns', () => {
    component.disabled = true;
    fixture.detectChanges();

    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect(selects.length).toBe(10);
    selects.forEach((de) => {
      expect((de.componentInstance as MatSelect).disabled).toBe(true);
    });
  });

  it('should render 10 rows with driving labels', () => {
    const labels = fixture.nativeElement.querySelectorAll('.app-dropdown-label');
    expect(labels.length).toBe(10);
    const expectedLabels = VEHICLE_CONTROL_FIELDS.map(f => f.label);
    for (let i = 0; i < 10; i++) {
      expect(labels[i].textContent?.trim()).toBe(expectedLabels[i]);
    }
  });

  it('first two dropdowns should be multi-select', () => {
    const selects = fixture.debugElement.queryAll(By.css('mat-select'));
    expect((selects[0].componentInstance as MatSelect).multiple).toBe(true);
    expect((selects[1].componentInstance as MatSelect).multiple).toBe(true);
    expect((selects[2].componentInstance as MatSelect).multiple).toBeFalsy();
  });
});
